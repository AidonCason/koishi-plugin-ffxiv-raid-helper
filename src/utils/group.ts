import { Context, Session, SessionError } from 'koishi';
import { Config } from '../config/settings';
import { selectById } from '../dao/teamDAO';
import logger from './logger';

export const getAllChatGroups = (config: Config) => {
  return new Set(
    Object.values(config.group_config_map).flatMap(g =>
      g.chat_groups.map(c => c.group_id)
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
 * 检查团名是否存在
 */
export const checkGroupName = async (config: Config, group_name: string) => {
  return Object.keys(config.group_config_map).includes(group_name);
};

/**
 * 获取团名
 */
export const getGroupNameById = async (ctx: Context, id: number) => {
  const teams = await selectById(ctx, id);
  if (teams.length == 0) {
    throw new SessionError('未查询到该团');
  }
  return teams[0].group_name;
};

/**
 * 获取实时需要通知报名的人
 */
export const getSignUpNoticeInTimeUsers = async (
  ctx: Context,
  config: Config,
  id: number
) => {
  const group_name = await getGroupNameById(ctx, id);
  return (
    config.group_config_map[group_name]?.leaders
      ?.filter(l => l.signup_notice_in_time)
      ?.map(l => l.user_id) || []
  );
};

/**
 * 获取定时需要通知报名的人
 */
export const getSignUpNoticeWithTimerUsers = async (
  ctx: Context,
  config: Config,
  id: number
) => {
  const group_name = await getGroupNameById(ctx, id);
  return (
    config.group_config_map[group_name]?.leaders
      ?.filter(l => l.signup_notice_with_timer)
      ?.map(l => l.user_id) || []
  );
};

/**
 * 获取实时需要通知报名的群
 */
export const getSignUpNoticeInTimeGroups = async (
  ctx: Context,
  config: Config,
  id: number
) => {
  const group_name = await getGroupNameById(ctx, id);
  return (
    config.group_config_map[group_name]?.chat_groups
      ?.filter(l => l.signup_notice_in_time)
      ?.map(l => l.group_id) || []
  );
};

/**
 * 获取定时需要通知报名的群
 */
export const getSignUpNoticeWithTimerGroups = async (
  ctx: Context,
  config: Config,
  id: number
) => {
  const group_name = await getGroupNameById(ctx, id);
  return (
    config.group_config_map[group_name]?.chat_groups
      ?.filter(l => l.signup_notice_with_timer)
      ?.map(l => l.group_id) || []
  );
};

/**
 * 获取需要通知开车的群
 */
export const getBeginNoticeGroups = async (
  ctx: Context,
  config: Config,
  id: number
) => {
  const group_name = await getGroupNameById(ctx, id);
  return (
    config.group_config_map[group_name]?.chat_groups
      ?.filter(l => l.begin_notice)
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
  const userId = session.userId;
  const userSevers = new Set<string>();
  for (const [server_name, group_ids] of getChatGroupMap(config)) {
    for (const group_id of group_ids) {
      const groupList = await session.bot.getGuildList();
      if (!groupList.data.map(g => g.id.toString()).includes(group_id)) {
        logger.warn(`group ${group_id} not exist`);
        continue;
      }
      const member_list = await session.bot.getGuildMemberList(group_id);
      if (member_list.data.map(m => m.user.id.toString()).includes(userId)) {
        userSevers.add(server_name);
      }
    }
  }
  return userSevers;
};

export const getUserGroups = async (session: Session, config: Config) => {
  if (!session.isDirect) return new Set<string>();
  const userId = session.userId;
  const userGroups = new Set<string>();
  for (const [group_name, group] of Object.entries(config.group_config_map)) {
    for (const chat_group of group.chat_groups) {
      const groupList = await session.bot.getGuildList();
      if (
        !groupList.data.map(g => g.id.toString()).includes(chat_group.group_id)
      ) {
        logger.warn(`group ${chat_group.group_id} not exist`);
        continue;
      }
      const member_list = await session.bot.getGuildMemberList(
        chat_group.group_id
      );
      if (member_list.data.map(m => m.user.id.toString()).includes(userId)) {
        userGroups.add(group_name);
      }
    }
  }

  return userGroups;
};
