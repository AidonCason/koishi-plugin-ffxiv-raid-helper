import { $, Context, Session } from "koishi"
import { raid_server_table_name, raid_sign_up_table_name, raid_table_name } from "../constant/common"
import { RaidListTable } from "../constant/db"

const getServerName = async (ctx: Context, session: Session) => {
    if (!session.guild) return
    const server = await ctx.database.get(raid_server_table_name, { server_group: { $eq: session.guildId } })
    return server[0]?.server_name
}

const getRaids = async (ctx: Context) => {
    return await ctx.database.get(raid_table_name, { raid_time: { $gt: new Date() } })
}

// 获取展示的团信息
const getRaidInfo = async (ctx: Context, raids?: RaidListTable[]) => {
    if (!raids)
        raids = await getRaids(ctx)
    if (!raids) return
    const sign_ups = await ctx.database
        .select(raid_sign_up_table_name)
        .groupBy('raid_name', { count: row => $.count(row.id) })
        .where(row => $.in(row.raid_name, raids.map(raid => raid.raid_name)))
        .execute()
    return raids.map(raid => `${raid.raid_server} - ${raid.raid_name} 时间： ${raid.raid_time.toLocaleString()} 报名人数： ${sign_ups.find(d => d.raid_name == raid.raid_name)?.count ?? 0}/${raid.max_members}`)
}

export { getServerName, getRaids, getRaidInfo }