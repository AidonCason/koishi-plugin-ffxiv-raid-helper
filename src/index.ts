import { Context } from 'koishi';
import { Config } from './config/settings';
import { dbSetup } from './constant/db';
import {} from 'koishi-plugin-cron';
import {
  checkDetailHandler,
  checkNowHandler,
  exportHandler,
  openRaidHandler
} from './service/managerService';
import {
  applyHandler,
  checkSelfHandler,
  contactLeaderHandler
} from './service/playerService';
import { clearDict, noticeOneDayBefore } from './service/noticeService';

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

  // 指挥操作
  ctx
    .command('开团 <raid_name:string> <raid_time:date>', '开启一个新的raid团', {
      authority: 4
    })
    .action(async (argv, raid_name: string, raid_time: Date) => {
      return await openRaidHandler(ctx, config, argv, raid_name, raid_time);
    });

  ctx
    .command('查看当前团', '查看当前所有开启中的团', {
      authority: 4
    })
    .action(async argv => {
      return await checkNowHandler(ctx, config, argv);
    });

  ctx
    .command('查看报名状况', '查看单个团的报名详情列表', {
      authority: 4
    })
    .action(async argv => {
      return await checkDetailHandler(ctx, config, argv);
    });

  ctx
    .command('导出报名状况 [encoding:string]', '导出单个团的报名详情列表', {
      authority: 4
    })
    .action(async (argv, encoding: string) => {
      return await exportHandler(ctx, config, argv, encoding);
    });

  // 报名者操作
  ctx.command('报名').action(async argv => {
    return await applyHandler(ctx, config, argv);
  });

  ctx.command('查看报名申请').action(async argv => {
    return await checkSelfHandler(ctx, config, argv);
  });

  ctx.command('联系指挥').action(async argv => {
    return await contactLeaderHandler(ctx, config, argv);
  });
}
