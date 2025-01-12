/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable class-methods-use-this */
import { cast } from "@sapphire/utilities";
import { APIUser, GatewayDispatchEvents, GatewayGuildMemberUpdateDispatch } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../Stores/Listener.js";
import { Constants } from "../Utilities/Constants.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";
import { Util } from "../Utilities/Util.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: GatewayDispatchEvents.GuildMemberUpdate,
    emitter: container.gateway
}))

export class GuildMemberUpdateListener extends Listener {
    public async run(payload: { data: GatewayGuildMemberUpdateDispatch }): Promise<void> {
        const botUser = await this.container.gateway.redis.get(Constants.BOT_USER_KEY);

        const old = await this.container.gateway.cache.members.get(payload.data.d.user.id);

        this.container.gateway.amqp.sender.publish(this.container.gateway.clientId, payload.data.t, {
            ...payload,
            old
        }, { persistent: false });

        if (Util.optionalEnv<boolean>("STATE_USER", "true") || cast<APIUser>(JSON.parse(botUser ?? "{ id: null }")).id === payload.data.d.user.id) {
            await this.container.gateway.redis.sadd(process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.USER_KEY}${Constants.KEYS_SUFFIX}` : `${Constants.USER_KEY}${Constants.KEYS_SUFFIX}`, payload.data.d.user.id);
            await this.container.gateway.cache.users.set(payload.data.d.user.id, payload.data.d.user);
        }
        if (Util.optionalEnv("STATE_MEMBER", "true") || cast<APIUser>(JSON.parse(botUser ?? "{ id: null }").id === payload.data.d.user.id)) {
            await this.container.gateway.redis.sadd(process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.MEMBER_KEY}${Constants.KEYS_SUFFIX}` : `${Constants.MEMBER_KEY}${Constants.KEYS_SUFFIX}`, `${payload.data.d.guild_id}:${payload.data.d.user.id}`);
            await this.container.gateway.cache.members.set(`${payload.data.d.guild_id}:${payload.data.d.user.id}`, {
                ...old,
                ...payload.data.d,
                user: Util.optionalEnv<boolean>("STATE_USER", "true") ? { } : payload.data.d.user
            });
        }
    }
}
