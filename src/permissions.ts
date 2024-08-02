import { Context } from 'koishi';
import { Config } from './config/settings';
import { getAdminGroups, getGroups } from './utils/raid';

export function permissionsSetup(ctx: Context, config: Config) {
  // 拥有admin权限视为拥有leader权限
  ctx.permissions.inherit('raid-helper:leader', ['raid-helper:admin']);

  // 初步检测权限，考虑到私聊触发等，更详细的检测应该在指令内部进行
  ctx.permissions.provide('raid-helper:admin', async (_, session) => {
    return getAdminGroups(config, session.platform, session.userId).length > 0;
  });

  ctx.permissions.provide('raid-helper:leader', async (_, session) => {
    return getGroups(config, session.platform, session.userId).length > 0;
  });
}
