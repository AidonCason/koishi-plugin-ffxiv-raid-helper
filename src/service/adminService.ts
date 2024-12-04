import { Argv, Context } from 'koishi';
import {
  deleteTeam,
  selectByGroupNameAndTeamName,
  updateTeam
} from '../dao/teamDAO';
import { buildQuestion, QuestionType } from '../constant/question';
import { askOneQuestion } from '../utils/question';
import { Config } from '../config/settings';
import {
  createBlackList,
  deleteBlackList,
  selectAllBlackList,
  selectByUserIdOrUserName
} from '../dao/blacklistDAO';
import { selectGroupName } from '../utils/team';
import { checkGroupName } from '../utils/group';

const deleteTeamHandler = async (
  ctx: Context,
  config: Config,
  argv: Argv,
  team_name: string
) => {
  if (!argv?.session) return;
  const session = argv.session;
  const group_name = await selectGroupName(ctx, config, session);
  const one = await selectByGroupNameAndTeamName(ctx, group_name, team_name);
  if (!one || one.length === 0) {
    return '团不存在！';
  }
  const check_delete_question = buildQuestion({
    label: 'check_delete',
    type: QuestionType.Boolean,
    name: '是否确认删除',
    content: `是否确认删除 ${team_name}`
  });
  const confirm = await askOneQuestion(config, session, check_delete_question);
  if (!confirm || confirm.preitter_answer == '否') {
    return '取消删除';
  }
  await deleteTeam(ctx, one[0].id);
  return '删除成功！';
};

const modifyTeamLeaderHandler = async (
  ctx: Context,
  config: Config,
  argv: Argv,
  team_name: string,
  leader_id: string
) => {
  if (!argv?.session) return;
  const session = argv.session;
  const group_name = await selectGroupName(ctx, config, session);
  const one = await selectByGroupNameAndTeamName(ctx, group_name, team_name);
  if (!one || one.length === 0) {
    return '团不存在！';
  }
  const team = one[0];
  const check_modify_question = buildQuestion({
    label: 'check_modify',
    type: QuestionType.Boolean,
    name: '是否确认修改',
    content: `是否确认修改 ${team_name} 的团长为 ${leader_id}`
  });
  const confirm = await askOneQuestion(config, session, check_modify_question);
  if (!confirm || confirm.preitter_answer == '否') {
    return '取消修改';
  }
  team.team_leader = leader_id;
  await updateTeam(ctx, team);
  return '修改成功！';
};

const queryBlackListHandler = async (
  ctx: Context,
  config: Config,
  argv: Argv,
  group_name: string
) => {
  if (!argv?.session) return;
  const session = argv.session;
  if (!group_name || !checkGroupName(config, group_name)) {
    group_name = await selectGroupName(ctx, config, session);
  }
  const black_list = await selectAllBlackList(ctx, group_name);
  if (!black_list || black_list.length === 0) {
    return '黑名单为空！';
  }
  return black_list
    .map(
      v =>
        `${v.user_id} ${v.user_name}@${v.server} ${v.reason} ${
          v.is_canceled ? '已取消' : ''
        }`
    )
    .join('\n');
};

const addToBlackListHandler = async (
  ctx: Context,
  config: Config,
  argv: Argv,
  group_name: string
) => {
  if (!argv?.session) return;
  const session = argv.session;
  if (!group_name || !checkGroupName(config, group_name)) {
    group_name = await selectGroupName(ctx, config, session);
  }
  const ask_info_question = buildQuestion({
    label: 'ask_info',
    type: QuestionType.Text,
    name: '输入信息',
    content: '请输入用户QQ, 游戏名, 区服, 原因'
  });
  const info = await askOneQuestion(config, session, ask_info_question);
  if (!info) {
    return '取消添加';
  }
  const [user_id, user_name, server, reason] = info.preitter_answer.split(' ');
  const check_add_question = buildQuestion({
    label: 'check_add',
    type: QuestionType.Boolean,
    name: '是否确认添加',
    content: `是否确认添加 ${user_id} ${user_name}@${server} ${reason}`
  });
  const confirm = await askOneQuestion(config, session, check_add_question);
  if (!confirm || confirm.preitter_answer == '否') {
    return '取消添加';
  }
  await createBlackList(ctx, group_name, user_id, user_name, server, reason);
  return '添加成功！';
};

const deleteBlackListHandler = async (
  ctx: Context,
  config: Config,
  argv: Argv,
  group_name: string
) => {
  if (!argv?.session) return;
  const session = argv.session;
  if (!group_name || !checkGroupName(config, group_name)) {
    group_name = await selectGroupName(ctx, config, session);
  }
  const black_list = await selectAllBlackList(ctx, group_name);
  if (!black_list || black_list.length === 0) {
    return '黑名单为空！';
  }
  const ask_info_question = buildQuestion({
    label: 'ask_info',
    type: QuestionType.Text,
    name: '输入信息',
    content: '请输入用户QQ或者游戏名'
  });
  const info = await askOneQuestion(config, session, ask_info_question);
  if (!info) {
    return '取消删除';
  }
  const list = await selectByUserIdOrUserName(ctx, info.preitter_answer);
  if (!list || list.length === 0) {
    return '黑名单中不存在该用户';
  }
  const choice_question = buildQuestion({
    label: 'choice',
    type: QuestionType.SignleChoice,
    name: '选择',
    content: '请选择要删除的用户',
    answer_range_desc: list.map(
      v => `${v.user_id} ${v.user_name}@${v.server} ${v.reason}`
    )
  });
  const choice = await askOneQuestion(config, session, choice_question);
  if (!choice) {
    return '取消删除';
  }
  const delete_user = list[parseInt(choice.answer) - 1];
  const check_delete_question = buildQuestion({
    label: 'check_delete',
    type: QuestionType.Boolean,
    name: '是否确认删除',
    content: `是否确认删除 ${delete_user.user_id} ${delete_user.user_name}@${delete_user.server} ${delete_user.reason}`
  });
  const confirm = await askOneQuestion(config, session, check_delete_question);
  if (!confirm || confirm.preitter_answer == '否') {
    return '取消删除';
  }
  await deleteBlackList(ctx, delete_user.id);
  return '删除成功！';
};

export {
  deleteTeamHandler,
  modifyTeamLeaderHandler,
  queryBlackListHandler,
  addToBlackListHandler,
  deleteBlackListHandler
};
