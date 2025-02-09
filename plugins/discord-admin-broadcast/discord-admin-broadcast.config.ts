// noinspection JSUnusedGlobalSymbols

import { z } from 'zod';
import { pluginBaseOptionsSchema } from '../../src/plugin-loader/plugin-base.config';

const enabledSchema = pluginBaseOptionsSchema.extend({
  enabled: z.literal(true),
  channelID: z.string().nonempty(),
}).describe("Send a copy of admin broadcasts made in game to a Discord channel.");

const schema = z.discriminatedUnion("enabled", [
  enabledSchema,
  pluginBaseOptionsSchema.extend({
    enabled: z.literal(false),
  }),
]);

export type DiscordAdminBroadcastEnabledOptions = z.infer<typeof enabledSchema>;

// Use a different schema for validation and for typing of the plugin, as only enabled plugin will have their main
// function called.
export default schema;

// If set, the plugin will only be loaded if the connectors are available.
// This means you won't have to deal with missing connectors errors.
export const requireConnectors = ['discord'];
