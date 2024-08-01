import { Context } from 'koishi';
import { Config } from './config/settings';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function permissionsSetup(ctx: Context, config: Config) {
  // 拥有admin权限视为拥有leader权限
  ctx.permissions.inherit('raid-helper:leader', ['raid-helper:admin']);

  ctx.permissions.provide('raid-helper:admin', async (name, session) => {
    return session.onebot?.sender?.role === 'owner';
  });

  ctx.permissions.provide('raid-helper:leader', async (name, session) => {
    return (await session.getUser()).authority >= 4;
  });
}
