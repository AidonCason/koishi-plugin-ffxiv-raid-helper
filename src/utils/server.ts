import { Context, Session } from 'koishi';
import { RaidListTable } from '../constant/db';
import { Config } from '../config/settings';
import { selectByDateAfter } from '../dao/raidDAO';
import { countByRaids } from '../dao/raidSignupDAO';
import { buildQuestion, QuestionType } from '../constant/question';
import { askOneQuestion } from './question';
import { date_locale_options, locale_settings } from './locale';

export const getServerGroupMap = (config: Config) => {
  return new Map(
    Object.entries(config.group_config_map).map(([k, v]) => [
      k,
      v.groups.map(g => g.group_id)
    ])
  );
};

export const getRaids = async (ctx: Context) => {
  return await selectByDateAfter(ctx, new Date());
};

// 获取展示的团信息
export const getRaidInfo = async (ctx: Context, raids?: RaidListTable[]) => {
  if (!raids) raids = await getRaids(ctx);
  if (!raids) return;
  const sign_ups = await countByRaids(ctx, raids);
  return raids.map(
    raid =>
      `${raid.raid_server} - [${raid.group_name}] ${raid.raid_name} 时间： ${raid.raid_time.toLocaleString(locale_settings.current, date_locale_options)} 报名人数： ${sign_ups.find(d => d.raid_name == raid.raid_name)?.count ?? 0}/${raid.max_members}`
  );
};

export const selectRaid = async (
  ctx: Context,
  config: Config,
  session: Session,
  prompt: string
) => {
  const raids = await getRaids(ctx);
  const raid_infos = await getRaidInfo(ctx, raids);
  if (!raid_infos) {
    await session.sendQueued('未查询到当前有团', config.message_interval);
    return;
  }
  const select_raid_question = buildQuestion({
    label: 'select_raid',
    type: QuestionType.SignleChoice,
    name: '选择团',
    content: prompt,
    answer_range_desc: raid_infos
  });
  const answer = await askOneQuestion(config, session, select_raid_question);
  if (!answer) return;
  return raids[parseInt(answer.answer) - 1];
};
