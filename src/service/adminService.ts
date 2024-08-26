import { Argv, Context } from 'koishi';
import { deleteTeam, selectByName, updateTeam } from '../dao/teamDAO';
import { buildQuestion, QuestionType } from '../constant/question';
import { askOneQuestion } from '../utils/question';
import { Config } from '../config/settings';

const deleteTeamHandler = async (
  ctx: Context,
  config: Config,
  argv: Argv,
  team_name: string
) => {
  if (!argv?.session) return;
  const session = argv.session;
  const one = await selectByName(ctx, team_name);
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
  const one = await selectByName(ctx, team_name);
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

export { deleteTeamHandler, modifyTeamLeaderHandler };
