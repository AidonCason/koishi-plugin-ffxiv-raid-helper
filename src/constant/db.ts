import { Context } from 'koishi';

// 全局表前缀
const table_prefix = 'ffxiv_raid_helper_';

// 团表名称
export const team_table_name = `${table_prefix}team`;
// 报名表名称
export const sign_up_table_name = `${table_prefix}sign_up`;
// 黑名单表名称
export const black_list_table_name = `${table_prefix}black_list`;
// 内鬼表名称
export const inner_ghost_table_name = `${table_prefix}inner_ghost`;

declare module 'koishi' {
  interface Tables {
    [team_table_name]: TeamListTable;
    [sign_up_table_name]: TeamSignUpTable;
    [black_list_table_name]: BlackListTable;
    [inner_ghost_table_name]: InnerGhostTable;
  }
}

// 团表
export interface TeamListTable {
  id: number;
  group_name: string;
  team_name: string;
  max_members: number; // 接纳报名的最大人数
  team_leader: string; // 指挥qq
  raid_start_time: Date; // 开团时间
  team_region: string; // 开团的服务器
  allow_sign_up: boolean;
  created_at: Date;
  updated_at: Date;
}

// 报名表
export interface TeamSignUpTable {
  id: number;
  team_name: string;
  user_id: string; // 用户id
  content: string; // 报名内容
  is_canceled: boolean; // 是否取消报名
  created_at: Date;
  updated_at: Date;
}

// 黑名单
export interface BlackListTable {
  id: number;
  group_name: string;
  user_id: string;
  user_name: string;
  server: string;
  reason: string;
  is_canceled: boolean;
  created_at: Date;
  updated_at: Date;
}

// 内鬼名单
export interface InnerGhostTable {
  id: number;
  group_name: string;
  user_id: string;
  user_name: string;
  server: string;
  remark: string;
  expired_at: Date;
  created_at: Date;
  updated_at: Date;
}

export function dbSetup(ctx: Context) {
  ctx.model.extend(
    team_table_name,
    {
      id: 'unsigned',
      group_name: 'string',
      team_name: 'string',
      max_members: 'unsigned', // 接纳报名的最大人数
      team_leader: 'string', // 指挥qq
      raid_start_time: 'timestamp', // 开车时间
      team_region: 'string', // 开团的服务器
      allow_sign_up: 'boolean',
      created_at: 'timestamp',
      updated_at: 'timestamp'
    },
    {
      primary: 'id',
      unique: ['team_name'],
      autoInc: true
    }
  );

  ctx.model.extend(
    sign_up_table_name,
    {
      id: 'unsigned',
      team_name: 'string', // 团名
      user_id: 'string', // 用户id
      content: 'text', // 报名内容
      is_canceled: {
        type: 'boolean',
        initial: false
      },
      created_at: 'timestamp',
      updated_at: 'timestamp'
    },
    {
      primary: 'id',
      autoInc: true
    }
  );

  ctx.model.extend(
    black_list_table_name,
    {
      id: 'unsigned',
      group_name: 'string',
      user_id: 'string',
      user_name: 'string',
      server: 'string',
      reason: 'text',
      is_canceled: {
        type: 'boolean',
        initial: false
      },
      created_at: 'timestamp',
      updated_at: 'timestamp'
    },
    {
      primary: 'id',
      autoInc: true
    }
  );

  ctx.model.extend(
    inner_ghost_table_name,
    {
      id: 'unsigned',
      group_name: 'string',
      user_id: 'string',
      user_name: 'string',
      server: 'string',
      remark: 'text',
      expired_at: 'timestamp',
      created_at: 'timestamp',
      updated_at: 'timestamp'
    },
    {
      primary: 'id',
      autoInc: true
    }
  );
}
