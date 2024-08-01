import { Context } from 'koishi';
import {} from '../constant/db';
import { raid_table_name } from '../constant/common';

/**
 * 查询时间范围内的团 [beginTime,endTime)
 * @returns RaidListTable[]
 */
export const selectByDateBetween = async (
  ctx: Context,
  begin_time: Date,
  end_time: Date
) => {
  return await ctx.database.get(raid_table_name, {
    raid_time: {
      $gte: begin_time,
      $lte: end_time
    }
  });
};
