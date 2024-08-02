import { Context, Driver } from 'koishi';
import { RaidListTable } from '../constant/db';
import { raid_table_name } from '../constant/common';

/**
 * 查询时间范围内的团 [beginTime,endTime)
 */
export const selectByDateBetween = async (
  ctx: Context,
  begin_time: Date,
  end_time: Date
): Promise<RaidListTable[]> => {
  return await ctx.database.get(raid_table_name, {
    raid_time: {
      $gte: begin_time,
      $lte: end_time
    }
  });
};

/**
 * 查询指定时间后的团 (beginTime,+∞)
 */
export const selectByDateAfter = async (
  ctx: Context,
  begin_time: Date
): Promise<RaidListTable[]> => {
  return await ctx.database.get(raid_table_name, {
    raid_time: {
      $gt: begin_time
    }
  });
};

/**
 * 查询指定名称的团
 */
export const selectByName = async (
  ctx: Context,
  raid_name: string
): Promise<RaidListTable[]> => {
  return await ctx.database.get(raid_table_name, {
    raid_name: { $eq: raid_name }
  });
};

/**
 * 开团
 */
export const createRaid = async (
  ctx: Context,
  raid_name: string,
  max_members: number,
  user_id: string,
  raid_time: Date,
  server_name: string
): Promise<RaidListTable[]> => {
  return await ctx.database.get(raid_table_name, {
    raid_name,
    max_members,
    raid_leader: user_id,
    raid_time,
    raid_server: server_name,
    allow_sign_up: true,
    created_at: new Date(),
    updated_at: new Date()
  });
};

/**
 * 关闭报名
 */
export const closeSignup = async (
  ctx: Context,
  id: number
): Promise<Driver.WriteResult> => {
  return await ctx.database.upsert(raid_table_name, () => [
    {
      id,
      allow_sign_up: false,
      updated_at: new Date()
    }
  ]);
};
