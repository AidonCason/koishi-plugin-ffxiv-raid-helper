const enum ErrorCode {
  Unknown = -1,
  OK = 0,
  Timeout,
  MaxRetry
}

// 全局表前缀
const table_prefix = 'ffxiv_raid_helper_';

// raid表名称
const raid_table_name = `${table_prefix}raid`;
// 报名表名称
const raid_sign_up_table_name = `${table_prefix}sign_up`;

export { ErrorCode, raid_table_name, raid_sign_up_table_name };
