import { Context } from "koishi";
import { Config } from "./config/settings";
import logger from "./utils/logger";

export function middlewareSetup(ctx: Context, config: Config) {
    ctx.middleware((session, next) => {
        logger.info(`server_group_map: ${JSON.stringify(config.server_group_map)}`)
        if (!session.guildId) return next()
        if (!config.server_group_map) return next()
        
        for (const [_, server_ids] of Object.entries(config.server_group_map)) {
            if (server_ids.includes(session.guildId)) {
                return next()
            }
        }
        return
    })
    ctx.middleware((session, next) => {
        if (!session.guildId) return next()
        if (session.platform != 'onebot') return next()
    })
}