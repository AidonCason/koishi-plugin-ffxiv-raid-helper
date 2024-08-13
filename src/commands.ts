import { Config } from './config/settings';
import {
  openTeamHandler,
  checkNowHandler,
  checkDetailHandler,
  exportHandler,
  closeSignupHandler,
  pushMessageToAllSignup,
  atUserByName
} from './service/managerService';
import {
  applyHandler,
  cancelSignupHandler,
  checkSelfHandler,
  contactLeaderHandler
} from './service/playerService';
import { Context } from 'koishi';
import { checkLeaderPermission, getAllChatGroups } from './utils/group';

export function commandSetup(ctx: Context, config: Config) {
  ctx
    .command('ffxiv-raid-helper', '最终幻想14高难组团管理助手')
    .action(async argv => {
      await argv.session.execute('ffxiv-raid-helper.help');
    });

  // 指挥操作 仅限在配置的群内或指挥私聊
  const leader_command = ctx
    .intersect(
      session =>
        getAllChatGroups(config).has(session.guildId) ||
        (session.isDirect &&
          checkLeaderPermission(config, session.platform, session.userId))
    )
    .command('ffxiv-raid-helper.leader', {
      permissions: ['raid-helper:leader']
    });

  // 开团
  leader_command
    .subcommand('开团 <raid_name:string> <raid_time:date>', '开启一个新团', {
      permissions: ['raid-helper:leader']
    })
    .example('开团 114团 2024-01-01T20:00')
    .example('开团 114团 2024-01-01 20:00')
    .example('开团 114团 2024 01 01 20:00')
    .action(async (argv, team_name: string, raid_time: Date) => {
      if (!team_name || team_name.length <= 0 || !raid_time) {
        await argv.session.send('参数错误，请检查输入');
        await argv.session.execute(`${argv.command.name} --help`);
        return;
      }
      return await openTeamHandler(ctx, config, argv, team_name, raid_time);
    });

  // 关闭报名
  leader_command
    .subcommand('关闭报名', '提前关闭报名', {
      permissions: ['raid-helper:leader']
    })
    .action(async argv => {
      return await closeSignupHandler(ctx, config, argv);
    });

  // 查看当前团
  leader_command
    .subcommand('查看当前团', '查看当前所有开启中的团', {
      permissions: ['raid-helper:leader']
    })
    .action(async argv => {
      return await checkNowHandler(ctx, config, argv);
    });

  // 查看报名情况
  leader_command
    .subcommand('查看报名状况', '查看单个团的报名详情列表', {
      permissions: ['raid-helper:leader']
    })
    .alias('查看报名详情')
    .alias('查看报名情况')
    .action(async argv => {
      return await checkDetailHandler(ctx, config, argv);
    });

  // 导出报名情况
  leader_command
    .subcommand('导出报名状况', '导出单个团的报名详情列表', {
      permissions: ['raid-helper:leader']
    })
    .alias('导出报名详情')
    .alias('导出报名情况')
    .action(async argv => {
      return await exportHandler(ctx, config, argv);
    });

  // 推送消息
  leader_command
    .subcommand('推送消息', '向所有报名者推送消息', {
      permissions: ['raid-helper:leader']
    })
    .action(async argv => {
      return await pushMessageToAllSignup(ctx, config, argv);
    });

  // 找人
  leader_command
    .subcommand(
      '找人 <...rest:string>',
      '@指定用户，使用模糊搜索，多个成员以空格分隔',
      {
        permissions: ['raid-helper:leader']
      }
    )
    .example('找人 杂鱼 杂鱼杂鱼')
    .action(async (argv, ...rest) => {
      return await atUserByName(ctx, config, argv, rest);
    });

  // 报名者操作，仅私聊
  const user_command = ctx
    .intersect(session => session.isDirect)
    .command('ffxiv-raid-helper.user', {
      permissions: ['raid-helper:user']
    });

  // 报名
  user_command
    .subcommand('报名', '报名参加当前团', {
      permissions: ['raid-helper:user']
    })
    .action(async argv => {
      return await applyHandler(ctx, config, argv);
    });

  // 查看报名
  user_command
    .subcommand('查看报名', '查看自己的报名情况', {
      permissions: ['raid-helper:user']
    })
    .action(async argv => {
      return await checkSelfHandler(ctx, config, argv);
    });

  // 取消报名
  user_command
    .subcommand('取消报名', '取消自己的报名', {
      permissions: ['raid-helper:user']
    })
    .action(async argv => {
      return await cancelSignupHandler(ctx, config, argv);
    });

  // 联系指挥
  user_command
    .subcommand('联系指挥', '联系当前团的指挥', {
      permissions: ['raid-helper:user']
    })
    .action(async argv => {
      return await contactLeaderHandler(ctx, config, argv);
    });

  ctx.command('ffxiv-raid-helper.help', '查看帮助').action(async argv => {
    await argv.session.execute('ffxiv-raid-helper.leader --help');
    await argv.session.execute('ffxiv-raid-helper.user --help');
  });
}
