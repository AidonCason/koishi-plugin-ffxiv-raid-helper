import { Context } from 'koishi';
import { Config } from './config/settings';
import logger from './utils/logger';

export function middlewareSetup(ctx: Context, config: Config) {
  // 不在配置文件中的群组不处理
  ctx.middleware((session, next) => {
    if (!session.guildId) return next();
    if (!config.server_group_map) return next();

    for (const [, group_ids] of Object.entries(config.server_group_map)) {
      if (group_ids.includes(session.guildId)) {
        return next();
      }
    }
    return;
  }, true);

  // 不在群里的报名信息不理会
  ctx.middleware(async (session, next) => {
    if (!session.isDirect) return next();
    if (session.platform != 'onebot') return next();

    const getUserSevers = async (userId: string) => {
      const userSevers = new Set<string>();
      for (const [server_name, group_ids] of Object.entries(
        config.server_group_map
      )) {
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

    const userSevers = await getUserSevers(session.userId);

    if (userSevers.size == 0) {
      // TODO: 改为赋予指令的临时权限或者其他方式，现在这种方式指令动了这里也得动
      if (session.content.includes('报名')) {
        // 我倒要看看是哪个小b崽子不入群就报名
        logger.warn(`user ${session.userId} not in any server`);
      }
      return;
    }
    return next();
  }, true);
}
