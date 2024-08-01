import { Context, Session } from 'koishi';
import { RaidListTable } from '../constant/db';
import { Config } from '../config/settings';
import { selectByDateAfter } from '../dao/raidDAO';
import { countByRaids } from '../dao/raidSignupDAO';

const getServerName = async (
  ctx: Context,
  config: Config,
  session: Session
) => {
  if (!session.guild) return;
  for (const [server_name, server_ids] of Object.entries(
    config.server_group_map
  )) {
    if (server_ids.includes(session.guildId)) {
      return server_name;
    }
  }
  await session.sendQueued('请在指定的群组内开团', config.message_interval);
};

const getRaids = async (ctx: Context) => {
  return await selectByDateAfter(ctx, new Date());
};

// 获取展示的团信息
const getRaidInfo = async (ctx: Context, raids?: RaidListTable[]) => {
  if (!raids) raids = await getRaids(ctx);
  if (!raids) return;
  const sign_ups = await countByRaids(ctx, raids);
  return raids.map(
    raid =>
      `${raid.raid_server} - ${raid.raid_name} 时间： ${raid.raid_time.toLocaleString()} 报名人数： ${sign_ups.find(d => d.raid_name == raid.raid_name)?.count ?? 0}/${raid.max_members}`
  );
};

const selectRaid = async (ctx: Context, config: Config, session: Session) => {
  const raids = await getRaids(ctx);
  const raid_infos = await getRaidInfo(ctx, raids);
  if (!raid_infos) {
    await session.sendQueued(
      '未查询到当前有团，请在开团后报名',
      config.message_interval
    );
    return;
  }
  await session.sendQueued(
    '请输入编号选择要查看的团，当前有如下团:\n' +
      raid_infos.map((e, idx) => `${idx + 1}. ${e}`).join('\n'),
    config.message_interval
  );
  const choice = parseInt(await session.prompt(), 10) || -1;
  if (!raid_infos[choice - 1]) {
    await session.sendQueued('团号错误', config.message_interval);
    return;
  }
  return raids[choice - 1];
};

export { getServerName, getRaids, getRaidInfo, selectRaid };
