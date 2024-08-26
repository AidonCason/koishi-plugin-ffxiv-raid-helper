import { Argv, Context, h } from 'koishi';
import { Config } from '../config/settings';
import logger from '../utils/logger';
import * as iconv from 'iconv-lite';
import { getTeamInfo, selectGroupName, selectCurrentTeam } from '../utils/team';
import {
  closeSignup,
  createTeam,
  openSignup,
  selectByDateAfterAndGroupName,
  selectByName,
  updateTeam
} from '../dao/teamDAO';
import { selectValidSignupByTeamName } from '../dao/signupDAO';
import { askOneQuestion, parseAnswerMap } from '../utils/question';
import Fuse from 'fuse.js';
import { buildQuestion, QuestionType } from '../constant/question';
import { locale_settings, date_locale_options } from '../utils/locale';
import { parseDateTime } from '../utils/date';

// 指挥开团
const openTeamHandler = async (
  ctx: Context,
  config: Config,
  argv: Argv,
  team_name: string,
  raid_time: Date
) => {
  if (!argv?.session) return;
  const session = argv.session;
  const one = await selectByName(ctx, team_name);
  if (one && one.length > 0) {
    return '团已经存在！';
  }
  if (raid_time < new Date()) {
    return '开团时间不能早于当前时间';
  }
  const group_name = await selectGroupName(ctx, config, session);
  const region_name = config.group_config_map[group_name].region_name;
  const confirm_create_question = buildQuestion({
    label: 'confirm_create',
    type: QuestionType.Boolean,
    name: '是否确认开团',
    content: `是否确认开团 ${group_name} ${team_name} 时间 ${raid_time.toLocaleString(locale_settings.current, date_locale_options)}`
  });
  const confirm = await askOneQuestion(
    config,
    session,
    confirm_create_question
  );
  if (!confirm || confirm.preitter_answer == '否') {
    return '取消开团';
  }
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

// 指挥修改最大人数
const modifyMaxMembersHandler = async (
  ctx: Context,
  config: Config,
  argv: Argv
) => {
  if (!argv?.session) return;
  const session = argv.session;
  const team = await selectCurrentTeam(ctx, config, session);
  await session.sendQueued(
    `当前最大人数为: ${team.max_members} 请输入新的最大人数：`,
    config.message_interval
  );
  await session.prompt(async session => {
    logger.debug('content:', session.content);
    const max_members = parseInt(session.content);
    if (isNaN(max_members) || max_members <= 0) {
      return '请输入正确的人数';
    }
    team.max_members = max_members;
    await updateTeam(ctx, team);
    return '修改成功!';
  });
};

// 指挥开启报名
const openSignupHandler = async (ctx: Context, config: Config, argv: Argv) => {
  if (!argv?.session) return;
  const session = argv.session;
  const team = await selectCurrentTeam(ctx, config, session);
  await openSignup(ctx, team.id);
  return '开启报名成功!';
};

// 指挥关闭报名
const closeSignupHandler = async (ctx: Context, config: Config, argv: Argv) => {
  if (!argv?.session) return;
  const session = argv.session;
  const team = await selectCurrentTeam(ctx, config, session);
  await closeSignup(ctx, team.id);
  return '关闭报名成功!';
};

// 指挥修改团时间
const modifyRaidTimeHandler = async (
  ctx: Context,
  config: Config,
  argv: Argv
) => {
  if (!argv?.session) return;
  const session = argv.session;
  const team = await selectCurrentTeam(ctx, config, session);
  await session.prompt(async session => {
    logger.debug('content:', session.content);
    const new_raid_time = parseDateTime(session.content);
    if (!new_raid_time) {
      return '请输入正确的时间';
    }
    team.raid_start_time = new_raid_time;
    await updateTeam(ctx, team);
    return '修改成功!';
  });
};

// 指挥查看当前团
const checkNowHandler = async (ctx: Context, config: Config, argv: Argv) => {
  if (!argv?.session) return;
  const group_name = await selectGroupName(ctx, config, argv.session);
  const teams = await selectByDateAfterAndGroupName(
    ctx,
    new Date(),
    group_name
  );
  const team_infos = await getTeamInfo(ctx, teams);
  if (!team_infos || team_infos.length == 0) {
    return '未查询到当前有团';
  }
  return '当前有如下团:\n' + team_infos.join('\n');
};

// 指挥查看报名详情
const checkDetailHandler = async (ctx: Context, config: Config, argv: Argv) => {
  if (!argv?.session) return;
  const session = argv.session;
  const team = await selectCurrentTeam(ctx, config, session);
  const team_name = team.team_name;
  const sign_up = await selectValidSignupByTeamName(ctx, team_name);
  if (!sign_up || sign_up.length == 0) {
    return '当前报名人数为: 0';
  }
  return `当前报名人数为: ${sign_up.length}\n${sign_up
    .map((s, idx) => {
      const content = parseAnswerMap(s.content);
      const user_server = content.get('SERVER')?.preitter_answer;
      const user_name = content.get('NICKNAME')?.preitter_answer;
      return `序号: ${idx + 1} ${user_server} - ${user_name}`;
    })
    .join('\n')}`;
};

// 指挥导出报名情况
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
  const title = Array.from(map.entries())
    .filter(entry => entry[0] != 'NEWBIE' && entry[0] != 'SERVER')
    .map(entry => entry[1].name)
    .join(',');
  const content = sign_up
    .map(s =>
      Array.from(parseAnswerMap(s.content))
        .filter(entry => entry[0] != 'NEWBIE' && entry[0] != 'SERVER')
        .map(entry => entry[1].preitter_answer)
        .join(',')
    )
    .join('\n');
  // 导出格式为utf8withBOM的csv
  // 为了兼容excel
  const buffer = iconv.encode(`${title}\n${content}`, 'utf8', {
    addBOM: true
  });
  const file = h.file(buffer, 'text/csv');
  file.attrs.name = `${team_name}.csv`;
  await session.send(file);
  return '导出结束';
};

// 指挥给所有报名人员推送消息
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
    logger.debug('content:', session.content);
    sign_up.forEach(async s => {
      logger.debug('send to:', s.user_id);
      session.bot.sendPrivateMessage(s.user_id, session.content);
    });
  });
  return '推送消息成功';
};

// 指挥根据名字at用户
const atUserByName = async (
  ctx: Context,
  config: Config,
  argv: Argv,
  user_names: string[]
) => {
  if (!argv?.session) return;
  const session = argv.session;
  if (!session.guild) {
    return '请在群聊中使用';
  }
  if (user_names.length == 0) {
    return '请输入要查找的用户';
  }
  const team = await selectCurrentTeam(ctx, config, session);
  const team_name = team.team_name;
  const sign_up = await selectValidSignupByTeamName(ctx, team_name);
  if (!sign_up || sign_up.length == 0) {
    return '当前报名人数为: 0';
  }
  const users = sign_up.map(s => {
    const content = parseAnswerMap(s.content);
    const nickname = content.get('NICKNAME')?.preitter_answer;
    return {
      user_id: s.user_id,
      nickname
    };
  });
  // 使用fuse进行模糊搜索
  const fuse = new Fuse(users, {
    includeScore: true,
    shouldSort: true,
    threshold: 0.2,
    keys: ['nickname']
  });
  const user_ids = user_names.map(user_name => {
    if (!user_name) {
      return null;
    }
    // 如果是数字，按序号查找
    const idx = parseInt(user_name);
    if (!isNaN(idx)) {
      if (idx <= 0 || idx > users.length) {
        return null;
      }
      return users[idx - 1].user_id;
    }
    const result = fuse.search(user_name);
    logger.debug('search result:', result);
    if (result.length == 0) {
      return null;
    }
    return result[0].item.user_id;
  });
  return user_ids
    .map(user_id => (user_id ? h('at', { id: user_id }) : '未找到用户'))
    .join(' ');
};

export {
  openTeamHandler,
  modifyMaxMembersHandler,
  openSignupHandler,
  closeSignupHandler,
  modifyRaidTimeHandler,
  checkNowHandler,
  checkDetailHandler,
  exportHandler,
  pushMessageToAllSignup,
  atUserByName
};
