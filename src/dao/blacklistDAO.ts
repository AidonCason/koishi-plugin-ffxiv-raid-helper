import { Context } from 'koishi';
import { BlackListTable, black_list_table_name } from '../constant/db';

/**
 * 查询user_id是否在黑名单中
 * @param ctx
 * @param user_id 用户id
 */
export const selectByUserId = async (
  ctx: Context,
  user_id: string
): Promise<BlackListTable[]> => {
  return await ctx.database.get(black_list_table_name, {
    user_id: { $eq: user_id }
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
  user_name: string,
  server: string
): Promise<BlackListTable[]> => {
  return await ctx.database.get(black_list_table_name, {
    user_name: { $eq: user_name },
    server: { $eq: server }
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
  user_id: string,
  user_name: string,
  server: string,
  reason: string
): Promise<BlackListTable> => {
  return await ctx.database.create(black_list_table_name, {
    user_id,
    user_name,
    server,
    reason
  });
};
