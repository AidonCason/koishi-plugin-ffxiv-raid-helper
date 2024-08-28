import { Context } from 'koishi';
import { Config } from './config/settings';
import { dbSetup } from './constant/db';
import {} from 'koishi-plugin-cron';
import {
  noticeOneDayBefore,
  noticeTwoHoursBefore
} from './service/noticeService';
import { commandSetup } from './commands';
import { permissionsSetup } from './permissions';
import logger from './utils/logger';

// 插件名
export const name = 'ffxiv-raid-helper';

// 前置服务
export const inject = {
  required: ['database', 'cron']
};

// 重新导出配置
export * from './config/settings';

export function apply(ctx: Context, config: Config) {
  dbSetup(ctx);

  // 每分钟检查是否当前有团，有的话对参团人员进行推送
  ctx.cron('0/5 * * * *', () => {
    noticeOneDayBefore(ctx, config);
    noticeTwoHoursBefore(ctx, config);
  });

  permissionsSetup(ctx, config);
  commandSetup(ctx, config);

  ctx.on('friend-request', async session => {
    if (
      config.friend_request_auto_accept &&
      (await ctx.permissions.test(['raid-helper:user'], session))
    ) {
      logger.debug('accept friend request');
      await session.bot.handleFriendRequest(session.messageId, true);
    }
  });

  ctx.on('guild-member-request', async session => {
    Object.values(config.group_config_map).forEach(groupConfig => {
      if (
        groupConfig.chat_groups.find(
          c => c.group_id === session.guildId && c.group_request_auto_accept
        )
      ) {
        logger.debug('accept guild member request');
        session.bot.handleGuildMemberRequest(session.messageId, true);
      }
    });
  });
}
