import { Context } from 'koishi';
import { Config } from './config/settings';
import { checkAdminPermission, checkLeaderPermission } from './utils/group';
import logger from './utils/logger';

export function permissionsSetup(ctx: Context, config: Config) {
  // 拥有admin权限视为拥有leader权限
  ctx.permissions.inherit('raid-helper:leader', ['raid-helper:admin']);

  // 拥有leader权限视为拥有user权限
  ctx.permissions.inherit('raid-helper:user', ['raid-helper:leader']);

  // 初步检测权限，考虑到私聊触发等，更详细的检测应该在指令内部进行
  ctx.permissions.provide('raid-helper:admin', async (_, session) => {
    return checkAdminPermission(config, session.platform, session.userId);
  });

  ctx.permissions.provide('raid-helper:leader', async (_, session) => {
    return checkLeaderPermission(config, session.platform, session.userId);
  });

  ctx.permissions.provide('raid-helper:user', async (_, session) => {
    if (session.platform !== 'onebot') return false;

    const userId = session.userId;
    for (const [, group] of Object.entries(config.group_config_map)) {
      for (const chat_group of group.chat_groups) {
        const groupList = await session.onebot.getGroupList();
        if (
          !groupList
            .map(g => g.group_id.toString())
            .includes(chat_group.group_id)
        ) {
          logger.warn(`group ${chat_group.group_id} not exist`);
          continue;
        }
        const member_list = await session.onebot.getGroupMemberList(
          chat_group.group_id
        );
        if (member_list.map(m => m.user_id.toString()).includes(userId)) {
          logger.debug(`user ${userId} in group ${chat_group.group_id}`);
          return true;
        }
      }
    }
    logger.debug(`user ${userId} not in any group`);
    return false;
  });
}
