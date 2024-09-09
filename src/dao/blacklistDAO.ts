import { Context } from 'koishi';
import { BlackListTable, black_list_table_name } from '../constant/db';

/**
 * 查询user_id是否在黑名单中
 * @param ctx
 * @param user_id 用户id
 */
export const selectByUserId = async (
  ctx: Context,
  group_name: string,
  user_id: string
): Promise<BlackListTable[]> => {
  return await ctx.database.get(black_list_table_name, {
    group_name: { $eq: group_name },
    user_id: { $eq: user_id },
    is_canceled: { $eq: false }
  });
};

/**
 * 查询是否存在区服和游戏名相同的黑名单
 * @param ctx
 * @param user_name 游戏名
 * @param server 区服
 */
export const selectByUserNameAndServer = async (
  ctx: Context,
  group_name: string,
  user_name: string,
  server: string
): Promise<BlackListTable[]> => {
  return await ctx.database.get(black_list_table_name, {
    group_name: { $eq: group_name },
    user_name: { $eq: user_name },
    server: { $eq: server },
    is_canceled: { $eq: false }
  });
};

/**
 * 模糊查询，返回user_id相同或者游戏名相同的黑名单
 */
export const selectByUserIdOrUserName = async (
  ctx: Context,
  query: string
): Promise<BlackListTable[]> => {
  return await ctx.database.get(black_list_table_name, {
    $or: [{ user_id: { $eq: query } }, { user_name: { $eq: query } }],
    is_canceled: { $eq: false }
  });
};

/**
 * 查询黑名单
 * @param ctx
 */
export const selectAllBlackList = async (
  ctx: Context,
  group_name: string
): Promise<BlackListTable[]> => {
  return await ctx.database.get(black_list_table_name, {
    group_name: { $eq: group_name },
    is_canceled: { $eq: false }
  });
};

/**
 * 添加黑名单
 * @param ctx
 * @param user_id 用户id
 * @param user_name 游戏名
 * @param server 区服
 * @param reason 原因
 */
export const createBlackList = async (
  ctx: Context,
  group_name: string,
  user_id: string,
  user_name: string,
  server: string,
  reason: string
): Promise<BlackListTable> => {
  return await ctx.database.create(black_list_table_name, {
    group_name,
    user_id,
    user_name,
    server,
    reason
  });
};

/**
 * 删除黑名单
 * @param ctx
 * @param id 黑名单id
 */
export const deleteBlackList = async (
  ctx: Context,
  id: number
): Promise<void> => {
  await ctx.database.set(
    black_list_table_name,
    {
      id
    },
    {
      is_canceled: true
    }
  );
};
