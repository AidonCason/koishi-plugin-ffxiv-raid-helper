import { Context } from "koishi";
import { Config } from "./config/settings";

export function permissionsSetup(ctx: Context, config: Config) {

    ctx.permissions.inherit('raid-helper:leader', ['authority:2']);
    ctx.permissions.inherit('raid-helper:admin', ['authority:4', 'raid-helper:leader']);

    ctx.permissions.provide('raid-helper:admin', async (name, session) => {
        return session.onebot?.sender?.role === 'owner';
    })
}