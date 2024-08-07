import { Context, Session } from 'koishi';
import { Config } from '../config/settings';
import { selectByName } from '../dao/teamDAO';
import logger from './logger';

export const getAllChatGroups = (config: Config) => {
  return Array.from(
    new Set(
      Object.values(config.group_config_map).flatMap(g =>
        g.chat_groups.map(c => c.group_id)
      )
    )
  );
};

export const getChatGroupMap = (config: Config) => {
  return new Map(
    Object.entries(config.group_config_map).map(([k, v]) => [
      k,
      v.chat_groups.map(g => g.group_id)
    ])
  );
};

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
export const getLeaderGroups = (
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
export const getGroupNameByTeamName = async (
  ctx: Context,
  team_name: string
) => {
  const teams = await selectByName(ctx, team_name);
  if (teams.length == 0) {
    throw new Error('未查询到该团');
  }
  return teams[0].group_name;
};

/**
 * 获取需要通知的人
 */
export const getNoticeUsers = async (
  ctx: Context,
  config: Config,
  team_name: string
) => {
  const group_name = await getGroupNameByTeamName(ctx, team_name);
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
  team_name: string
) => {
  const group_name = await getGroupNameByTeamName(ctx, team_name);
  return (
    config.group_config_map[group_name]?.chat_groups
      ?.filter(l => l.notice)
      ?.map(l => l.group_id) || []
  );
};

/**
 * 获取用户
 * @param session
 * @param config
 * @returns
 */
export const getUserSevers = async (session: Session, config: Config) => {
  if (!session.isDirect) return new Set<string>();
  if (session.platform != 'onebot') return new Set<string>();
  const userId = session.userId;
  const userSevers = new Set<string>();
  for (const [server_name, group_ids] of getChatGroupMap(config)) {
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

export const getUserGroups = async (session: Session, config: Config) => {
  if (!session.isDirect) return new Set<string>();
  if (session.platform != 'onebot') return new Set<string>();
  const userId = session.userId;
  const userGroups = new Set<string>();
  for (const [group_name, group] of Object.entries(config.group_config_map)) {
    for (const chat_group of group.chat_groups) {
      const groupList = await session.onebot.getGroupList();
      if (
        !groupList.map(g => g.group_id.toString()).includes(chat_group.group_id)
      ) {
        logger.warn(`group ${chat_group.group_id} not exist`);
        continue;
      }
      const member_list = await session.onebot.getGroupMemberList(
        chat_group.group_id
      );
      if (member_list.map(m => m.user_id.toString()).includes(userId)) {
        userGroups.add(group_name);
      }
    }
  }

  return userGroups;
};
