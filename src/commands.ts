import { Config } from './config/settings';
import {
  openRaidHandler,
  checkNowHandler,
  checkDetailHandler,
  exportHandler,
  closeSignupHandler,
  pushMessageToAllSignup
} from './service/managerService';
import {
  applyHandler,
  cancelSignupHandler,
  checkSelfHandler,
  contactLeaderHandler
} from './service/playerService';
import { Context } from 'koishi';

export function commandSetup(ctx: Context, config: Config) {
  // 指挥操作
  ctx
    .command('开团 <raid_name:string> <raid_time:date>', '开启一个新的raid团', {
      permissions: ['raid-helper:leader']
    })
    .action(async (argv, raid_name: string, raid_time: Date) => {
      return await openRaidHandler(ctx, config, argv, raid_name, raid_time);
    });

  ctx
    .command('关闭报名', '提前关闭报名', {
      permissions: ['raid-helper:leader']
    })
    .action(async argv => {
      return await closeSignupHandler(ctx, config, argv);
    });

  ctx
    .command('查看当前团', '查看当前所有开启中的团', {
      permissions: ['raid-helper:leader']
    })
    .action(async argv => {
      return await checkNowHandler(ctx, config, argv);
    });

  ctx
    .command('查看报名状况', '查看单个团的报名详情列表', {
      permissions: ['raid-helper:leader']
    })
    .action(async argv => {
      return await checkDetailHandler(ctx, config, argv);
    });

  ctx
    .command('导出报名状况', '导出单个团的报名详情列表', {
      permissions: ['raid-helper:leader']
    })
    .action(async argv => {
      return await exportHandler(ctx, config, argv);
    });

  ctx
    .command('推送消息到所有报名者', {
      permissions: ['raid-helper:leader']
    })
    .action(async argv => {
      return await pushMessageToAllSignup(ctx, config, argv);
    });

  // 报名者操作，仅私聊
  ctx
    .intersect(session => session.isDirect)
    .command('报名')
    .action(async argv => {
      return await applyHandler(ctx, config, argv);
    });

  ctx
    .intersect(session => session.isDirect)
    .command('查看报名申请')
    .action(async argv => {
      return await checkSelfHandler(ctx, config, argv);
    });

  ctx
    .intersect(session => session.isDirect)
    .command('取消报名')
    .action(async argv => {
      return await cancelSignupHandler(ctx, config, argv);
    });

  ctx
    .intersect(session => session.isDirect)
    .command('联系指挥')
    .action(async argv => {
      return await contactLeaderHandler(ctx, config, argv);
    });
}
