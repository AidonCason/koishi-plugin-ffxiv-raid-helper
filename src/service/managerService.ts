import { Argv, Context, h } from 'koishi';
import { date_locale_options, locale_settings } from '../utils/locale';
import {} from 'koishi-plugin-adapter-onebot';
import { Config } from '../config/settings';
import logger from '../utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';
import { pathToFileURL } from 'url';
import * as iconv from 'iconv-lite';
import { getTeamInfo, selectGroupName, selectCurrentTeam } from '../utils/team';
import {
  closeSignup,
  createTeam,
  selectByDateAfter,
  selectByName
} from '../dao/teamDAO';
import { selectValidSignupByTeamName } from '../dao/signupDAO';
import { parseAnswerMap } from '../utils/question';

// 指挥开团
const openTeamHandler = async (
  ctx: Context,
  config: Config,
  argv: Argv,
  team_name: string,
  raid_time: Date
) => {
  if (!argv?.session) return;

  if (!team_name || team_name.length <= 0 || !raid_time) {
    return '名称或日期格式错误！参考：开团 114团 2024-01-01T20:00';
  }

  const session = argv.session;
  const one = await selectByName(ctx, team_name);
  if (one && one.length > 0) {
    return '团已经存在！';
  }
  const group_name = await selectGroupName(ctx, config, session);
  const region_name = config.group_config_map[group_name].region_name;
  await createTeam(
    ctx,
    group_name,
    team_name,
    40,
    session.userId,
    raid_time,
    region_name
  );
  return '开团成功!';
};

const closeSignupHandler = async (ctx: Context, config: Config, argv: Argv) => {
  if (!argv?.session) return;
  const session = argv.session;
  const team = await selectCurrentTeam(ctx, config, session);
  await closeSignup(ctx, team.id);
  return '关闭报名成功!';
};

const checkNowHandler = async (ctx: Context, config: Config, argv: Argv) => {
  if (!argv?.session) return;
  const teams = await selectByDateAfter(ctx, new Date());
  const team_infos = await getTeamInfo(ctx, teams);
  if (team_infos) {
    return '当前有如下团:\n' + team_infos.join('\n');
  } else {
    return '未查询到当前有团';
  }
};

const checkDetailHandler = async (ctx: Context, config: Config, argv: Argv) => {
  if (!argv?.session) return;
  const session = argv.session;
  const team = await selectCurrentTeam(ctx, config, session);
  const team_name = team.team_name;
  const sign_up = await selectValidSignupByTeamName(ctx, team_name);
  if (!sign_up || sign_up.length == 0) {
    return '当前报名人数为: 0';
  }
  return `当前报名人数为: ${sign_up.length}\n${sign_up.map((s, idx) => {
    const content = parseAnswerMap(s.content);
    const user_server = content.get('SERVER')?.preitter_answer;
    const user_name = content.get('NICKNAME')?.preitter_answer;
    return `序号: ${idx + 1} ${user_server} - ${user_name}`;
  })}`;
};

const exportHandler = async (ctx: Context, config: Config, argv: Argv) => {
  if (!argv?.session) return;
  const session = argv.session;
  if (session.platform! in ['onebot', 'slack', 'sandbox']) {
    return '尚未支持的导出平台';
  }
  const team = await selectCurrentTeam(ctx, config, session);
  const team_name = team.team_name;
  const sign_up = await selectValidSignupByTeamName(ctx, team_name);
  if (!sign_up || sign_up.length == 0) {
    return '当前报名人数为: 0';
  }
  const map = parseAnswerMap(sign_up[0].content);
  const title =
    Array.from(map.entries())
      .filter(entry => entry[0] != 'NEWBIE' && entry[0] != 'SERVER')
      .map(entry => entry[1].name)
      .join(',') +
    '\n' +
    sign_up
      .map(s =>
        Array.from(parseAnswerMap(s.content))
          .filter(entry => entry[0] != 'NEWBIE' && entry[0] != 'SERVER')
          .map(entry => entry[1].preitter_answer)
          .join(',')
      )
      .join('\n');
  // 导出格式为utf8withBOM的csv
  // 为了兼容excel
  const buffer = iconv.encode(title, 'utf8', {
    addBOM: true
  });

  const root = path.join(ctx.baseDir, 'temp', 'ffxiv-raid-helper');
  const file_name =
    team_name +
    '-' +
    team.raid_start_time
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
};

const pushMessageToAllSignup = async (
  ctx: Context,
  config: Config,
  argv: Argv
) => {
  if (!argv?.session) return;
  const session = argv.session;
  const team = await selectCurrentTeam(ctx, config, session);
  const team_name = team.team_name;
  const sign_up = await selectValidSignupByTeamName(ctx, team_name);
  if (!sign_up || sign_up.length == 0) {
    return '当前报名人数为: 0';
  }
  await session.sendQueued('请输入要推送的消息', config.message_interval);
  await session.prompt(async session => {
    sign_up.forEach(async s => {
      const user_id = s.user_id;
      if (session.platform == 'onebot') {
        const message = session.onebot.message;
        await session.onebot.sendPrivateMsg(user_id, message);
      } else {
        const message = argv.args.join(' ');
        await session.sendQueued(message, config.message_interval);
      }
    });
  });
  return '推送消息成功';
};

export {
  openTeamHandler,
  closeSignupHandler,
  checkNowHandler,
  checkDetailHandler,
  exportHandler,
  pushMessageToAllSignup
};
