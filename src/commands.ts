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
  ctx.command('ffxiv-raid-helper', '最终幻想14高难组团管理助手');

  // 指挥操作
  const leader_command = ctx.command('ffxiv-raid-helper/leader');
  leader_command
    .subcommand(
      '开团 <raid_name:string> <raid_time:date>',
      '开启一个新的raid团',
      {
        permissions: ['raid-helper:leader']
      }
    )
    .action(async (argv, raid_name: string, raid_time: Date) => {
      return await openRaidHandler(ctx, config, argv, raid_name, raid_time);
    });
  leader_command
    .subcommand('关闭报名', '提前关闭报名', {
      permissions: ['raid-helper:leader']
    })
    .action(async argv => {
      return await closeSignupHandler(ctx, config, argv);
    });

  leader_command
    .subcommand('查看当前团', '查看当前所有开启中的团', {
      permissions: ['raid-helper:leader']
    })
    .action(async argv => {
      return await checkNowHandler(ctx, config, argv);
    });

  leader_command
    .subcommand('查看报名状况', '查看单个团的报名详情列表', {
      permissions: ['raid-helper:leader']
    })
    .alias('查看报名详情')
    .alias('查看报名情况')
    .action(async argv => {
      return await checkDetailHandler(ctx, config, argv);
    });

  leader_command
    .subcommand('导出报名状况', '导出单个团的报名详情列表', {
      permissions: ['raid-helper:leader']
    })
    .alias('导出报名详情')
    .alias('导出报名情况')
    .action(async argv => {
      return await exportHandler(ctx, config, argv);
    });

  leader_command
    .subcommand('推送消息', '向所有报名者推送消息', {
      permissions: ['raid-helper:leader']
    })
    .action(async argv => {
      return await pushMessageToAllSignup(ctx, config, argv);
    });

  // 报名者操作，仅私聊
  const user_command = ctx
    .intersect(session => session.isDirect)
    .command('ffxiv-raid-helper/user');

  user_command.subcommand('报名').action(async argv => {
    return await applyHandler(ctx, config, argv);
  });

  user_command.subcommand('查看报名').action(async argv => {
    return await checkSelfHandler(ctx, config, argv);
  });

  user_command.subcommand('取消报名').action(async argv => {
    return await cancelSignupHandler(ctx, config, argv);
  });

  user_command.subcommand('联系指挥').action(async argv => {
    return await contactLeaderHandler(ctx, config, argv);
  });
}
