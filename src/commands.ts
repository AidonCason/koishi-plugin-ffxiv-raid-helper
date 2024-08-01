import { Config } from './config/settings';
import {
  openRaidHandler,
  checkNowHandler,
  checkDetailHandler,
  exportHandler
} from './service/managerService';
import {
  applyHandler,
  checkSelfHandler,
  contactLeaderHandler
} from './service/playerService';
import { Context } from 'koishi';

export function commandSetup(ctx: Context, config: Config) {
  // 指挥操作
  ctx
    .command('开团 <raid_name:string> <raid_time:date>', '开启一个新的raid团', {
      authority: 4
    })
    .action(async (argv, raid_name: string, raid_time: Date) => {
      return await openRaidHandler(ctx, config, argv, raid_name, raid_time);
    });
  ctx.permissions.inherit('command:开团', ['raid-helper:leader']);

  ctx
    .command('查看当前团', '查看当前所有开启中的团', { authority: 4 })
    .action(async argv => {
      return await checkNowHandler(ctx, config, argv);
    });

  ctx.permissions.inherit('command:查看当前团', ['raid-helper:leader']);

  ctx
    .command('查看报名状况', '查看单个团的报名详情列表', { authority: 4 })
    .action(async argv => {
      return await checkDetailHandler(ctx, config, argv);
    });

  ctx.permissions.inherit('command:查看报名状况', ['raid-helper:leader']);

  ctx
    .command('导出报名状况 [encoding:string]', '导出单个团的报名详情列表', {
      authority: 4
    })
    .action(async (argv, encoding: string) => {
      return await exportHandler(ctx, config, argv, encoding);
    });

  ctx.permissions.inherit('command:导出报名状况', ['raid-helper:leader']);

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