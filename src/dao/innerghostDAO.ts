import { Context } from 'koishi';
import { InnerGhostTable, inner_ghost_table_name } from '../constant/db';

/**
 * 查询全部
 * @param ctx
 */
export const selectAllInnerGhost = async (
  ctx: Context,
  group_name: string
): Promise<InnerGhostTable[]> => {
  return await ctx.database.get(inner_ghost_table_name, {
    group_name: { $eq: group_name }
  });
};

/**
 * 根据qq号查询
 * @param ctx
 * @param user_id 用户id
 */
export const selectInnerGhostByGroupNameAndUserId = async (
  ctx: Context,
  group_name: string,
  user_id: string
): Promise<InnerGhostTable[]> => {
  return await ctx.database.get(inner_ghost_table_name, {
    group_name: { $eq: group_name },
    user_id: { $eq: user_id },
    expired_at: { $gt: new Date() }
  });
};

/**
 * 添加
 * @param ctx
 * @param user_id 用户id
 * @param user_name 游戏名
 * @param server 区服
 * @param remark 备注
 */
export const createInnerGhost = async (
  ctx: Context,
  group_name: string,
  user_id: string,
  user_name: string,
  server: string,
  remark: string
): Promise<InnerGhostTable> => {
  const expired_at = new Date();
  expired_at.setMonth(expired_at.getMonth() + 3);
  return await ctx.database.create(inner_ghost_table_name, {
    group_name,
    user_id,
    user_name,
    server,
    remark,
    expired_at: expired_at,
    updated_at: new Date(),
    created_at: new Date()
  });
};

/**
 * 删除
 * @param ctx
 * @param id
 */
export const deleteInnerGhostById = async (
  ctx: Context,
  id: number
): Promise<void> => {
  const expired_at = new Date();
  expired_at.setMonth(expired_at.getMonth() + 3);
  await ctx.database.remove(inner_ghost_table_name, {
    id
  });
};

/**
 * 刷新时间
 * @param ctx
 * @param id
 */
export const refreshInnerGhostById = async (
  ctx: Context,
  id: number
): Promise<void> => {
  const expired_at = new Date();
  expired_at.setMonth(expired_at.getMonth() + 3);
  await ctx.database.set(
    inner_ghost_table_name,
    {
      id
    },
    {
      expired_at: expired_at,
      updated_at: new Date()
    }
  );
};
