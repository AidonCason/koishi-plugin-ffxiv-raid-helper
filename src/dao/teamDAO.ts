import { Context, Driver } from 'koishi';
import { TeamListTable, team_table_name } from '../constant/db';

/**
 * 查询时间范围内的团 [beginTime,endTime)
 */
export const selectByDateBetween = async (
  ctx: Context,
  begin_time: Date,
  end_time: Date
): Promise<TeamListTable[]> => {
  return await ctx.database.get(team_table_name, {
    raid_start_time: {
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
): Promise<TeamListTable[]> => {
  return await ctx.database.get(team_table_name, {
    raid_start_time: {
      $gt: begin_time
    }
  });
};

/**
 * 查询指定名称的团
 */
export const selectByName = async (
  ctx: Context,
  team_name: string
): Promise<TeamListTable[]> => {
  return await ctx.database.get(team_table_name, {
    team_name: { $eq: team_name }
  });
};

/**
 * 查询指定时间后的团 (beginTime,+∞) 并且是指定团队
 *
 * @param ctx
 * @param begin_time
 * @param group_name
 * @returns
 */
export const selectByDateAfterAndGroupName = async (
  ctx: Context,
  begin_time: Date,
  group_name: string
): Promise<TeamListTable[]> => {
  return await ctx.database.get(team_table_name, {
    raid_start_time: {
      $gt: begin_time
    },
    group_name: { $eq: group_name }
  });
};

/**
 * 开团
 */
export const createTeam = async (
  ctx: Context,
  group_name: string,
  team_name: string,
  max_members: number,
  user_id: string,
  raid_start_time: Date,
  region_name: string
): Promise<TeamListTable> => {
  return await ctx.database.create(team_table_name, {
    group_name,
    team_name: team_name,
    max_members,
    team_leader: user_id,
    raid_start_time: raid_start_time,
    team_region: region_name,
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
  return await ctx.database.upsert(team_table_name, () => [
    {
      id,
      allow_sign_up: false,
      updated_at: new Date()
    }
  ]);
};
