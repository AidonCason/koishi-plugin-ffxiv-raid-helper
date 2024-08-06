import { Context } from 'koishi';
import { Config } from './config/settings';
import { checkAdminPermission, checkLeaderPermission } from './utils/group';

export function permissionsSetup(ctx: Context, config: Config) {
  // 拥有admin权限视为拥有leader权限
  ctx.permissions.inherit('raid-helper:leader', ['raid-helper:admin']);

  // 初步检测权限，考虑到私聊触发等，更详细的检测应该在指令内部进行
  ctx.permissions.provide('raid-helper:admin', async (_, session) => {
    return checkAdminPermission(config, session.platform, session.userId);
  });

  ctx.permissions.provide('raid-helper:leader', async (_, session) => {
    return checkLeaderPermission(config, session.platform, session.userId);
  });
}
