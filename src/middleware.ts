import { Context } from 'koishi';
import { Config } from './config/settings';
import { getServerGroupMap } from './utils/server';

export function middlewareSetup(ctx: Context, config: Config) {
  // 不在配置文件中的群组不处理
  ctx.middleware((session, next) => {
    if (!session.guildId) return next();

    for (const [, group_ids] of getServerGroupMap(config)) {
      if (group_ids.includes(session.guildId)) {
        return next();
      }
    }
    return;
  }, true);
}
