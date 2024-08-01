import { Context } from 'koishi';
import { raid_sign_up_table_name, raid_table_name } from './common';

declare module 'koishi' {
  interface Tables {
    ffxiv_raid_helper_raid: RaidListTable;
    ffxiv_raid_helper_sign_up: RaidSignUpTable;
  }
}

// 团表
export interface RaidListTable {
  id: number;
  raid_name: string; // 团名
  max_members: number; // 接纳报名的最大人数
  raid_leader: string; // 指挥qq
  raid_time: Date; // 开团时间
  raid_server: string; // 开团的服务器
  allow_sign_up: boolean;
  created_at: Date;
  updated_at: Date;
}

// 报名表
export interface RaidSignUpTable {
  id: number;
  raid_name: string; // 团名
  user_id: string; // 用户id
  content: string; // 报名内容
  history_content: string; // 报名内容
  is_canceled: boolean; // 是否取消报名
  created_at: Date;
  updated_at: Date;
}

export function dbSetup(ctx: Context) {
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
      content: 'text', // 报名内容
      history_content: 'text', // 报名内容
      is_canceled: 'boolean', // 是否取消报名
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
}
