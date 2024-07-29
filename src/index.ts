import { Context } from 'koishi';
import { Config } from './config/settings';
import { raid_sign_up_table_name, raid_table_name } from './constant/common';
import {
  checkDetailHandler,
  checkNowHandler,
  exportHandler,
  openRaidHandler
} from './service/managerService';
import { applyHandler, checkSelfHandler } from './service/playerService';

// 插件名
export const name = 'ffxiv-raid-helper';

// 前置服务
export const inject = {
  required: ['database', 'assets']
};

// 重新导出配置
export * from './config/settings';

export function apply(ctx: Context, config: Config) {
  // write your plugin here
  // create table
  ctx.model.extend(
    raid_table_name,
    {
      id: 'unsigned',
      raid_name: 'string', // 团名
      max_members: 'unsigned', // 接纳报名的最大人数
      raid_leader: 'string', // 指挥qq
      raid_time: 'timestamp', // 开团时间
      raid_server: 'string', // 开团的服务器
      allow_sign_up: 'boolean',
      created_at: 'timestamp',
      updated_at: 'timestamp'
    },
    {
      primary: 'id',
      unique: ['raid_name'],
      foreign: null,
      autoInc: true
    }
  );

  ctx.model.extend(
    raid_sign_up_table_name,
    {
      id: 'unsigned',
      raid_name: 'string', // 团名
      user_id: 'string', // 用户id
      content: 'string', // 报名内容
      history_content: 'string', // 报名内容
      created_at: 'timestamp',
      updated_at: 'timestamp'
    },
    {
      primary: 'id',
      unique: [['raid_name', 'user_id']], // 同一团一人只能报名一次
      foreign: null,
      autoInc: true
    }
  );

  // 指挥操作
  ctx
    .command('开团 <raid_name:string> <raid_time:date>')
    .action(async (argv, raid_name: string, raid_time: Date) => {
      return await openRaidHandler(ctx, config, argv, raid_name, raid_time);
    });

  ctx.command('查看当前团').action(async argv => {
    return await checkNowHandler(ctx, config, argv);
  });

  ctx.command('查看报名状况').action(async argv => {
    return await checkDetailHandler(ctx, config, argv);
  });

  ctx.command('导出报名状况').action(async argv => {
    return await exportHandler(ctx, config, argv);
  });

  // 报名者操作
  ctx.command('报名').action(async argv => {
    return await applyHandler(ctx, config, argv);
  });

  ctx.command('查看报名申请').action(async argv => {
    return await checkSelfHandler(ctx, config, argv);
  });
}
