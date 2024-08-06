import { Context, Session } from 'koishi';
import { TeamListTable } from '../constant/db';
import { Config } from '../config/settings';
import { selectByDateAfter } from '../dao/teamDAO';
import { countByRaids } from '../dao/signupDAO';
import { buildQuestion, QuestionType } from '../constant/question';
import { askOneQuestion } from './question';
import { date_locale_options, locale_settings } from './locale';

export const getTeams = async (ctx: Context) => {
  return await selectByDateAfter(ctx, new Date());
};

// 获取展示的团信息
export const getTeamInfo = async (ctx: Context, teams?: TeamListTable[]) => {
  if (!teams) teams = await getTeams(ctx);
  if (!teams) return;
  const sign_ups = await countByRaids(ctx, teams);
  return teams.map(
    team =>
      `${team.team_region} - [${team.group_name}] ${team.team_name} 时间： ${team.raid_start_time.toLocaleString(locale_settings.current, date_locale_options)} 报名人数： ${sign_ups.find(d => d.team_name == team.team_name)?.count ?? 0}/${team.max_members}`
  );
};

export const selectTeam = async (
  ctx: Context,
  config: Config,
  session: Session,
  prompt: string
) => {
  const teams = await getTeams(ctx);
  const team_infos = await getTeamInfo(ctx, teams);
  if (!team_infos) {
    await session.sendQueued('未查询到当前有团', config.message_interval);
    return;
  }
  const select_team_question = buildQuestion({
    label: 'select_team',
    type: QuestionType.SignleChoice,
    name: '选择团',
    content: prompt,
    answer_range_desc: team_infos
  });
  const answer = await askOneQuestion(config, session, select_team_question);
  if (!answer) return;
  return teams[parseInt(answer.answer) - 1];
};
