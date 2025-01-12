/* eslint-disable no-case-declarations */
import { WebSocketShardEvents } from "@discordjs/ws";
import { ProcessBootstrapper } from "./ProcessBootstrapper.js";
import { NezuGateway } from "../../Structures/NezuGateway.js";

const gateway = new NezuGateway();
await gateway.connect();

const bootstrapper = new ProcessBootstrapper();
void bootstrapper.bootstrap({
    forwardEvents: [
        WebSocketShardEvents.Closed,
        WebSocketShardEvents.Debug,
        WebSocketShardEvents.HeartbeatComplete,
        WebSocketShardEvents.Hello,
        WebSocketShardEvents.Resumed,
        WebSocketShardEvents.Error,
        WebSocketShardEvents.Ready
    ],
    shardCallback: shard => {
        shard.on(WebSocketShardEvents.Dispatch, data => gateway.emit(WebSocketShardEvents.Dispatch, { ...data, shardId: shard.id }));
    }
});
