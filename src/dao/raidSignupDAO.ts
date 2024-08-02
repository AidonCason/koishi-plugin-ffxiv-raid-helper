import { $, Context, Driver } from 'koishi';
import { RaidSignUpTable } from '../constant/db';
import { raid_sign_up_table_name } from '../constant/common';

/**
 * 查询该团所有有效的报名申请
 * @param raid_name 团名
 * @returns RaidSignUpTable[]
 */
export const selectValidSignupByRaidName = async (
  ctx: Context,
  raid_name: string
): Promise<RaidSignUpTable[]> => {
  return await ctx.database.get(raid_sign_up_table_name, {
    raid_name: { $eq: raid_name },
    is_canceled: { $eq: false }
  });
};

/**
 * 查询该团某成员所有报名申请
 * @param raid_name 团名
 * @param user_id 用户id，一般为qq号
 * @returns RaidSignUpTable[]
 */
export const selectAllSignupByRaidNameAndUserId = async (
  ctx: Context,
  raid_name: string,
  user_id: string
): Promise<RaidSignUpTable[]> => {
  return await ctx.database.get(raid_sign_up_table_name, {
    raid_name: { $eq: raid_name },
    user_id: { $eq: user_id }
  });
};

/**
 * 查询该团某成员所有有效的报名申请
 * @param ctx
 * @param raid_name 团名
 * @param user_id 用户id，一般为qq号
 * @returns RaidSignUpTable[]
 */
export const selectAllValidSignupByRaidNameAndUserId = async (
  ctx: Context,
  raid_name: string,
  user_id: string
): Promise<RaidSignUpTable[]> => {
  return await ctx.database.get(raid_sign_up_table_name, {
    raid_name: { $eq: raid_name },
    user_id: { $eq: user_id },
    is_canceled: { $eq: false }
  });
};

/**
 * 查询该团某成员所有取消的报名申请
 * @param ctx
 * @param raid_name 团名
 * @param user_id 用户id，一般为qq号
 * @returns RaidSignUpTable[]
 */
export const selectAllCanceledSignupByRaidNameAndUserId = async (
  ctx: Context,
  raid_name: string,
  user_id: string
): Promise<RaidSignUpTable[]> => {
  return await ctx.database.get(raid_sign_up_table_name, {
    raid_name: { $eq: raid_name },
    user_id: { $eq: user_id },
    is_canceled: { $eq: true }
  });
};

/**
 * 创建新的报名申请
 * @param raid_name 团名
 * @param user_id 用户id，一般为qq号
 * @param content 报名内容,json格式
 */
export const createSignup = async (
  ctx: Context,
  raid_name: string,
  user_id: string,
  content: string
): Promise<RaidSignUpTable> => {
  return await ctx.database.create(raid_sign_up_table_name, {
    raid_name,
    user_id,
    content,
    is_canceled: false,
    created_at: new Date(),
    updated_at: new Date()
  });
};

/**
 * 取消自己的报名申请
 * @param id 主键
 * @param history_content 取消报名留存
 */
export const cancelSignup = async (
  ctx: Context,
  id: number
): Promise<Driver.WriteResult> => {
  return await ctx.database.upsert(raid_sign_up_table_name, () => [
    {
      id,
      is_canceled: true,
      updated_at: new Date()
    }
  ]);
};

/**
 * 查询指定团的报名数
 * @returns [{raid_name: string, count: number}]
 */
export const countByRaids = async (
  ctx: Context,
  raids: { raid_name: string }[]
): Promise<{ raid_name: string; count: number }[]> => {
  return await ctx.database
    .select(raid_sign_up_table_name)
    .where({ is_canceled: false })
    .groupBy('raid_name', { count: row => $.count(row.id) })
    .where(row =>
      $.in(
        row.raid_name,
        raids.map(raid => raid.raid_name)
      )
    )
    .execute();
};
