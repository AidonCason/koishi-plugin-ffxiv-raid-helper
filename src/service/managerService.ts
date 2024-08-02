import { Argv, Context, h } from 'koishi';
import { date_locale_options, locale_settings } from '../utils/locale';
import {} from 'koishi-plugin-adapter-onebot';
import { Config } from '../config/settings';
import logger from '../utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';
import { pathToFileURL } from 'url';
import * as iconv from 'iconv-lite';
import { getRaidInfo, selectRaid } from '../utils/server';
import { closeSignup, createRaid, selectByName } from '../dao/raidDAO';
import { selectValidSignupByRaidName } from '../dao/raidSignupDAO';
import { buildQuestion, Question, QuestionType } from '../constant/question';
import { askOneQuestion } from '../utils/question';

// 指挥开团
const openRaidHandler = async (
  ctx: Context,
  config: Config,
  argv: Argv,
  raid_name: string,
  raid_time: Date
) => {
  if (!argv?.session) return;

  if (!raid_name || raid_name.length <= 0 || !raid_time) {
    return '名称或日期格式错误！参考：开团 114团 2024-01-01T20:00';
  }

  const session = argv.session;
  const one = await selectByName(ctx, raid_name);
  if (one && one.length > 0) {
    return '团已经存在！';
  }
  const group_name_server_name_map = new Map<string, string>();
  // 如果在群组内开团
  if (session.guildId) {
    // 以群号查找是哪个团
    Object.entries(config.group_config_map).map(([group_name, group]) => {
      if (group.groups.findIndex(g => g.group_id == session.guildId) >= 0) {
        group_name_server_name_map.set(group_name, group.server);
      }
    });
  }
  // 如果没查到
  if (group_name_server_name_map.size == 0) {
    // 通过发送的userId查找是哪个团
    Object.entries(config.group_config_map).map(([group_name, group]) => {
      if (group.leaders.findIndex(l => l.user_id == session.userId) >= 0) {
        group_name_server_name_map.set(group_name, group.server);
      }
    });
  }
  // 还是没查到
  if (group_name_server_name_map.size == 0) {
    return '请在指定的群组内开团';
  }
  // 如果只有一个团，那么就不用选择了
  let group_name = group_name_server_name_map.keys().next().value;
  let server_name = group_name_server_name_map.values().next().value;
  if (group_name_server_name_map.size > 1) {
    // 选择哪个团
    const group_choice_question: Question = buildQuestion({
      label: 'group_name',
      type: QuestionType.SignleChoice,
      name: '选择团',
      content: '请选择一个团内开团',
      answer_range_desc: Array.from(group_name_server_name_map.keys())
    });
    const answer = await askOneQuestion(config, session, group_choice_question);
    if (!answer) return '取消开团';
    group_name = answer.preitter_answer;
    server_name = group_name_server_name_map.get(group_name);
  }
  await createRaid(
    ctx,
    group_name,
    raid_name,
    40,
    session.userId,
    raid_time,
    server_name
  );
  return '开团成功!';
};

const closeSignupHandler = async (ctx: Context, config: Config, argv: Argv) => {
  if (!argv?.session) return;
  const session = argv.session;

  const raid = await selectRaid(ctx, config, session);
  if (!raid) return;

  await closeSignup(ctx, raid.id);
  return '关闭报名成功!';
};

const checkNowHandler = async (ctx: Context, config: Config, argv: Argv) => {
  if (!argv?.session) return;
  const radi_infos = await getRaidInfo(ctx);
  if (radi_infos) {
    return '当前有如下团:\n' + radi_infos.join('\n');
  } else {
    return '未查询到当前有团';
  }
};

const checkDetailHandler = async (ctx: Context, config: Config, argv: Argv) => {
  if (!argv?.session) return;
  const session = argv.session;
  const raid = await selectRaid(ctx, config, session);
  if (!raid) return;
  const raid_name = raid.raid_name;
  const sign_up = await selectValidSignupByRaidName(ctx, raid_name);
  if (!sign_up || sign_up.length == 0) {
    return '当前报名人数为: 0';
  }
  return `当前报名人数为: ${sign_up.length}\n${sign_up.map((s, idx) => {
    const content = JSON.parse(s.content);
    const user_server = content.find(p => p[0] == '所在服务器')[1];
    const user_name = content.find(p => p[0] == '角色姓名')[1];
    return `序号: ${idx + 1} ${user_server} - ${user_name}`;
  })}`;
};

const exportHandler = async (ctx: Context, config: Config, argv: Argv) => {
  if (!argv?.session) return;
  const session = argv.session;
  if (session.platform! in ['onebot', 'slack', 'sandbox']) {
    return '尚未支持的导出平台';
  }
  const raid = await selectRaid(ctx, config, session);
  if (!raid) return;
  const raid_name = raid.raid_name;

  const sign_up = await selectValidSignupByRaidName(ctx, raid_name);
  if (!sign_up || sign_up.length == 0) {
    return '当前报名人数为: 0';
  } else {
    const title =
      JSON.parse(sign_up[0].content)
        .slice(2)
        .map(p => p[0])
        .join(',') +
      '\n' +
      sign_up
        .map(s =>
          JSON.parse(s.content)
            .slice(2)
            .map(p => p[1])
            .join(',')
        )
        .join('\n');
    const buffer = iconv.encode(title, 'utf8', {
      addBOM: true
    });

    const root = path.join(ctx.baseDir, 'temp', 'ffxiv-raid-helper');
    const file_name =
      raid_name +
      '-' +
      raid.raid_time
        .toLocaleString(locale_settings.current, date_locale_options)
        .replaceAll('/', '')
        .replaceAll(' ', '')
        .replaceAll(':', '') +
      '.csv';
    const file_path = path.join(root, file_name);
    await fs.mkdir(root, { recursive: true });
    await fs.writeFile(file_path, buffer);
    if (session.platform && session.platform == 'onebot') {
      const file_path = pathToFileURL(path.resolve(root, file_name)).href;
      logger.debug('to send:{}', file_path);
      if (session.isDirect) {
        await session.onebot.sendPrivateMsg(session.userId, [
          {
            type: 'file',
            data: {
              file: file_path,
              name: file_name
            }
          }
        ]);
      } else {
        await session.onebot.sendGroupMsg(session.channelId, [
          {
            type: 'file',
            data: {
              file: file_path,
              name: file_name
            }
          }
        ]);
      }
    } else if (session.platform && session.platform == 'slack') {
      const h_file = h.image(pathToFileURL(path.resolve(root, file_name)).href);

      logger.debug(h_file);
      await session.sendQueued(h_file, config.message_interval);
    }
    logger.warn('尚不支持的导出平台');
    session.sendQueued('导出结束', config.message_interval);
  }
};

export {
  openRaidHandler,
  closeSignupHandler,
  checkNowHandler,
  checkDetailHandler,
  exportHandler
};
