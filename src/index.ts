import { Context } from 'koishi';
import { Config } from './config/settings';
import { dbSetup } from './constant/db';
import {} from 'koishi-plugin-cron';
import { clearDict, noticeOneDayBefore } from './service/noticeService';
import { commandSetup } from './commands';

// 插件名
export const name = 'ffxiv-raid-helper';

// 前置服务
export const inject = {
  required: ['database', 'assets', 'cron']
};

// 重新导出配置
export * from './config/settings';

export function apply(ctx: Context, config: Config) {
  dbSetup(ctx);

  // 每分钟检查是否当前有团，有的话对参团人员进行推送
  ctx.cron('*/1 * * * *', () => noticeOneDayBefore(ctx, config));
  // 每天零点清理一次推送
  ctx.cron('* 0 * * *', clearDict);

  commandSetup(ctx, config);
}
