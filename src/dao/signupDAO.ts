import { $, Context, Driver } from 'koishi';
import { TeamSignUpTable, sign_up_table_name } from '../constant/db';

/**
 * 查询该团所有有效的报名申请
 * @param team_id 团id
 * @returns RaidSignUpTable[]
 */
export const selectValidSignupByTeamId = async (
  ctx: Context,
  team_id: number
): Promise<TeamSignUpTable[]> => {
  return await ctx.database.get(sign_up_table_name, {
    team_name: { $eq: `${team_id}` },
    is_canceled: { $eq: false }
  });
};

/**
 * 查询该团某成员所有有效的报名申请
 * @param ctx
 * @param team_id 团id
 * @param user_id 用户id，一般为qq号
 * @returns RaidSignUpTable[]
 */
export const selectAllValidSignupByTeamIdAndUserId = async (
  ctx: Context,
  team_id: number,
  user_id: string
): Promise<TeamSignUpTable[]> => {
  return await ctx.database.get(sign_up_table_name, {
    team_name: { $eq: `${team_id}` },
    user_id: { $eq: user_id },
    is_canceled: { $eq: false }
  });
};

/**
 * 查询该团某成员所有取消的报名申请
 * @param ctx
 * @param team_id 团id
 * @param user_id 用户id，一般为qq号
 * @returns RaidSignUpTable[]
 */
export const selectAllCanceledSignupByTeamIdAndUserId = async (
  ctx: Context,
  team_id: number,
  user_id: string
): Promise<TeamSignUpTable[]> => {
  return await ctx.database.get(sign_up_table_name, {
    team_name: { $eq: `${team_id}` },
    user_id: { $eq: user_id },
    is_canceled: { $eq: true }
  });
};

/**
 * 创建新的报名申请
 * @param team_id 团id
 * @param user_id 用户id，一般为qq号
 * @param content 报名内容,json格式
 */
export const createSignup = async (
  ctx: Context,
  team_id: number,
  user_id: string,
  content: string
): Promise<TeamSignUpTable> => {
  return await ctx.database.create(sign_up_table_name, {
    team_name: `${team_id}`,
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
 */
export const cancelSignup = async (
  ctx: Context,
  id: number
): Promise<Driver.WriteResult> => {
  return await ctx.database.set(
    sign_up_table_name,
    { id },
    { is_canceled: true }
  );
};

/**
 * 查询指定团的报名数
 * @param team_id 团id
 * @returns number
 */
export const countByTeamName = async (
  ctx: Context,
  team_id: number
): Promise<number> => {
  return await ctx.database
    .select(sign_up_table_name)
    .where({ team_name: `${team_id}`, is_canceled: false })
    .execute(row => $.count(row.id));
};

/**
 * 查询指定团的报名数
 * @returns [{team_name: string, count: number}]
 */
export const countByRaids = async (
  ctx: Context,
  raids: { id: number }[]
): Promise<{ team_name: string; count: number }[]> => {
  return await ctx.database
    .select(sign_up_table_name)
    .where({ is_canceled: false })
    .groupBy('team_name', { count: row => $.count(row.id) })
    .where(row =>
      $.in(
        row.team_name,
        raids.map(raid => `${raid.id}`)
      )
    )
    .execute();
};

/**
 * 查询某团指定时间范围内的所有报名
 */
export const selectAllValidSignupByTeamIdAndDateBetween = async (
  ctx: Context,
  team_id: number,
  begin_time: Date,
  end_time: Date
): Promise<TeamSignUpTable[]> => {
  return await ctx.database.get(sign_up_table_name, {
    team_name: { $eq: `${team_id}` },
    is_canceled: { $eq: false },
    created_at: { $gte: begin_time, $lt: end_time }
  });
};

/**
 * 查询每个用户的报名次数
 */
export const selectSignupCountByUser = async (
  ctx: Context,
  team_id: number
): Promise<{ user_id: string; count: number; is_success: boolean }[]> => {
  return await ctx.database
    .select(sign_up_table_name)
    .where({
      team_name: `${team_id}`
    })
    .groupBy(['user_id', 'is_canceled'], {
      count: row => $.count(row.id),
      is_success: row => $.xor(row.is_canceled)
    })
    .execute();
};
