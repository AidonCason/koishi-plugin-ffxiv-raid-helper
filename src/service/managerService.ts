import { Argv, Context, h } from 'koishi';
import { Config } from '../config/settings';
import logger from '../utils/logger';
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
import Fuse from 'fuse.js';

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
  if (!team_infos || team_infos.length == 0) {
    return '未查询到当前有团';
  }
  return '当前有如下团:\n' + team_infos.join('\n');
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
  return `当前报名人数为: ${sign_up.length}\n${sign_up
    .map((s, idx) => {
      const content = parseAnswerMap(s.content);
      const user_server = content.get('SERVER')?.preitter_answer;
      const user_name = content.get('NICKNAME')?.preitter_answer;
      return `序号: ${idx + 1} ${user_server} - ${user_name}`;
    })
    .join('\n')}`;
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
    keys: ['nickname']
  });
  const user_ids = user_names.map(user_name => {
    const result = fuse.search(user_name);
    logger.debug('search result:', result);
    return result[0].item.user_id;
  });
  return user_ids.map(user_id => h('at', { id: user_id })).join(' ');
};

export {
  openTeamHandler,
  closeSignupHandler,
  checkNowHandler,
  checkDetailHandler,
  exportHandler,
  pushMessageToAllSignup,
  atUserByName
};
