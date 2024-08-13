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
    const userId = session.userId;
    for (const [, group] of Object.entries(config.group_config_map)) {
      for (const chat_group of group.chat_groups) {
        const groupList = await session.bot.getGuildList();
        if (
          !groupList.data
            .map(g => g.id.toString())
            .includes(chat_group.group_id)
        ) {
          logger.warn(`group ${chat_group.group_id} not exist`);
          continue;
        }
        const member_list = await session.bot.getGuildMemberList(
          chat_group.group_id
        );
        if (member_list.data.map(m => m.user.id.toString()).includes(userId)) {
          logger.debug(`user ${userId} in group ${chat_group.group_id}`);
          return true;
        }
      }
    }
    logger.debug(`user ${userId} not in any group`);
    return false;
  });
}
