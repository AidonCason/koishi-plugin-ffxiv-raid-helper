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
  ctx.cron('0/5 * * * *', () => {
    noticeOneDayBefore(ctx, config);
    noticeTwoHoursBefore(ctx, config);
  });

  permissionsSetup(ctx, config);
  commandSetup(ctx, config);
}
