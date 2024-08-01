import { Context } from 'koishi';
import {} from '../constant/db';
import { raid_sign_up_table_name } from '../constant/common';

/**
 * 查询该团所有有效的报名申请
 * @param raid_name 团名
 * @returns RaidSignUpTable[]
 */
export const selectSignupByRaidName = async (
  ctx: Context,
  raid_name: string
) => {
  return await ctx.database.get(raid_sign_up_table_name, {
    raid_name: { $eq: raid_name },
    is_canceled: { $eq: false }
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
) => {
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
 * 查询自己的报名申请
 * @param raid_name 团名
 * @param user_id 用户id，一般为qq号
 * @returns RaidSignUpTable[]
 */
export const checkSelfSignup = async (
  ctx: Context,
  raid_name: string,
  user_id: string
) => {
  return await ctx.database.get(raid_sign_up_table_name, {
    user_id: { $eq: user_id },
    raid_name: { $eq: raid_name },
    is_canceled: { $eq: false }
  });
};

/**
 * 重新提交报名申请
 * @param id 主键
 * @param content 报名内容,json格式
 */
export const reSignup = async (ctx: Context, id: number, content: string) => {
  return await ctx.database.upsert(raid_sign_up_table_name, () => [
    {
      id,
      content,
      is_canceled: false,
      updated_at: new Date()
    }
  ]);
};

/**
 * 取消自己的报名申请
 * @param id 主键
 * @param history_content 取消报名留存
 */
export const cancelSignup = async (
  ctx: Context,
  id: number,
  history_content: string
) => {
  return await ctx.database.upsert(raid_sign_up_table_name, () => [
    {
      id,
      history_content,
      is_canceled: true,
      updated_at: new Date()
    }
  ]);
};