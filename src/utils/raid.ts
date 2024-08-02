import { Config } from '../config/settings';

/**
 * 查询该用户有指挥权限的所有团
 */
export const getAdminGroups = (
  config: Config,
  platform: string,
  user_id: string
) => {
  return config.group_config_maps.filter(
    g =>
      g.platform == platform &&
      g.leaders.findIndex(l => l.user_id == user_id && l.admin) > 0
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
  return config.group_config_maps.filter(
    g =>
      g.platform == platform &&
      g.leaders.findIndex(l => l.user_id == user_id) > 0
  );
};

/**
 * 获取团名
 */
export const getGroupName = (raid_name: string) => {
  return raid_name.match(/^\[.+\]/)[0];
};

/**
 * 获取需要通知的人
 */
export const getNoticeUsers = (config: Config, raid_name: string) => {
  const group_name = getGroupName(raid_name);
  return config.group_config_maps
    .find(g => g.group_name == group_name)
    ?.leaders?.filter(l => l.notice)
    ?.map(l => l.user_id);
};

/**
 * 获取需要通知的群
 */
export const getNoticeGroups = (config: Config, raid_name: string) => {
  const group_name = getGroupName(raid_name);
  return config.group_config_maps
    .find(g => g.group_name == group_name)
    ?.groups?.filter(l => l.notice)
    ?.map(l => l.group_id);
};
