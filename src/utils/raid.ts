import { Context, Session } from 'koishi';
import { Config } from '../config/settings';
import { selectByName } from '../dao/raidDAO';
import logger from './logger';
import { getServerGroupMap } from './server';

/**
 * 查询该用户有指挥权限的所有团
 */
export const getAdminGroups = (
  config: Config,
  platform: string,
  user_id: string
) => {
  return Object.entries(config.group_config_map).filter(
    ([, group]) =>
      group.platform == platform &&
      group.leaders.findIndex(l => l.user_id == user_id && l.admin) > 0
  );
};

/**
 * 查询该用户有指挥权限的所有团
 */
export const getGroups = (
  config: Config,
  platform: string,
  user_id: string
) => {
  return Object.entries(config.group_config_map).filter(
    ([, group]) =>
      group.platform == platform &&
      group.leaders.findIndex(l => l.user_id == user_id) > 0
  );
};

export const checkAdminPermission = (
  config: Config,
  platform: string,
  user_id: string
) => {
  return (
    Object.entries(config.group_config_map).findIndex(([, group]) => {
      if (group.platform != platform) return false;
      if (group.admin == user_id) return true;
      if (group.leaders.findIndex(l => l.user_id == user_id && l.admin) >= 0)
        return true;
      return false;
    }) >= 0
  );
};

export const checkLeaderPermission = (
  config: Config,
  platform: string,
  user_id: string
) => {
  return (
    Object.entries(config.group_config_map).findIndex(([, group]) => {
      if (group.platform != platform) return false;
      if (group.admin == user_id) return true;
      if (group.leaders.findIndex(l => l.user_id == user_id) >= 0) return true;
      return false;
    }) >= 0
  );
};

/**
 * 获取团名
 */
export const getGroupNameByRaidName = async (
  ctx: Context,
  raid_name: string
) => {
  const raids = await selectByName(ctx, raid_name);
  if (raids.length == 0) {
    throw new Error('未查询到该团');
  }
  return raids[0].group_name;
};

/**
 * 获取需要通知的人
 */
export const getNoticeUsers = async (
  ctx: Context,
  config: Config,
  raid_name: string
) => {
  const group_name = await getGroupNameByRaidName(ctx, raid_name);
  return (
    config.group_config_map[group_name]?.leaders
      ?.filter(l => l.notice)
      ?.map(l => l.user_id) || []
  );
};

/**
 * 获取需要通知的群
 */
export const getNoticeGroups = async (
  ctx: Context,
  config: Config,
  raid_name: string
) => {
  const group_name = await getGroupNameByRaidName(ctx, raid_name);
  return (
    config.group_config_map[group_name]?.groups
      ?.filter(l => l.notice)
      ?.map(l => l.group_id) || []
  );
};

export const getUserSevers = async (session: Session, config: Config) => {
  if (!session.isDirect) return new Set<string>();
  if (session.platform != 'onebot') return new Set<string>();
  const userId = session.userId;
  const userSevers = new Set<string>();
  for (const [server_name, group_ids] of getServerGroupMap(config)) {
    for (const group_id of group_ids) {
      const groupList = await session.onebot.getGroupList();
      if (!groupList.map(g => g.group_id.toString()).includes(group_id)) {
        logger.warn(`group ${group_id} not exist`);
        continue;
      }
      const member_list = await session.onebot.getGroupMemberList(group_id);
      if (member_list.map(m => m.user_id.toString()).includes(userId)) {
        userSevers.add(server_name);
      }
    }
  }
  return userSevers;
};
