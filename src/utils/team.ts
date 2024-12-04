import { Context, Session, SessionError } from 'koishi';
import { TeamListTable } from '../constant/db';
import { Config } from '../config/settings';
import { selectByDateAfterAndGroupName } from '../dao/teamDAO';
import { countByRaids } from '../dao/signupDAO';
import { buildQuestion, QuestionType } from '../constant/question';
import { askOneQuestion } from './question';
import { date_locale_options, locale_settings } from './locale';
import logger from './logger';

// 获取展示的团信息
export const getTeamInfo = async (ctx: Context, teams: TeamListTable[]) => {
  const sign_ups = await countByRaids(ctx, teams);
  return teams.map(
    team =>
      `${team.team_region} - [${team.group_name}] ${team.team_name} 时间： ${team.raid_start_time.toLocaleString(locale_settings.current, date_locale_options)} 报名人数： ${sign_ups.find(d => d.team_name == team.team_name)?.count ?? 0}/${team.max_members}`
  );
};

export const selectGroupName = async (
  ctx: Context,
  config: Config,
  session: Session,
  onlyCurrentGuild: boolean = false
): Promise<string> => {
  const group_name_set = new Set<string>();
  // 从群组内查找 该群关联的团
  if (session.guildId) {
    Object.entries(config.group_config_map).forEach(([group_name, group]) => {
      if (
        group.chat_groups.findIndex(g => g.group_id == session.guildId) >= 0
      ) {
        group_name_set.add(group_name);
      }
    });
  }
  // 从leader查找 权限用户
  if (!onlyCurrentGuild) {
    Object.entries(config.group_config_map).forEach(([group_name, group]) => {
      if (group.admin == session.userId) {
        group_name_set.add(group_name);
      }
      if (group.leaders.findIndex(l => l.user_id == session.userId) >= 0) {
        group_name_set.add(group_name);
      }
    });
  }
  // 从member查找 普通报名用户
  if (!onlyCurrentGuild) {
    for (const [group_name, group] of Object.entries(config.group_config_map)) {
      const member_list = await session.bot.getGuildMemberList(
        group.chat_groups[0].group_id
      );
      if (
        member_list.data.map(m => m.user.id.toString()).includes(session.userId)
      ) {
        group_name_set.add(group_name);
      }
    }
  }
  logger.debug('group_name_set:', group_name_set);
  // 都没查到的话查找范围改成所有团
  if (group_name_set.size == 0) {
    Object.keys(config.group_config_map).forEach(group_name => {
      group_name_set.add(group_name);
    });
  }
  // 如果只有一个团，那么就不用选择了
  if (group_name_set.size == 1) {
    return group_name_set.values().next().value;
  }
  const group_choice_question = buildQuestion({
    label: 'select_group',
    type: QuestionType.SignleChoice,
    name: '选择团',
    content: '请选择一个团',
    answer_range_desc: Array.from(group_name_set)
  });
  const answer = await askOneQuestion(config, session, group_choice_question);
  if (!answer) {
    throw new SessionError('未选择团');
  }
  return answer.preitter_answer;
};

export const selectCurrentTeam = async (
  ctx: Context,
  config: Config,
  session: Session,
  onlyCurrentGuild: boolean = false
): Promise<TeamListTable> => {
  const group_name = await selectGroupName(
    ctx,
    config,
    session,
    onlyCurrentGuild
  );
  const teams = await selectByDateAfterAndGroupName(
    ctx,
    new Date(),
    group_name
  );
  if (!teams || teams.length == 0) {
    throw new SessionError('未查询到当前有队伍');
  }
  if (teams.length == 1) return teams[0];
  const team_infos = await getTeamInfo(ctx, teams);
  const select_team_question = buildQuestion({
    label: 'select_team',
    type: QuestionType.SignleChoice,
    name: '选择队伍',
    content: '请选择一个队伍',
    answer_range_desc: team_infos
  });
  const answer = await askOneQuestion(config, session, select_team_question);
  if (!answer) {
    throw new SessionError('未选择队伍');
  }
  return teams[parseInt(answer.answer) - 1];
};
