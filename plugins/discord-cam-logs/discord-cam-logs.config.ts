import { z } from 'zod';
import { pluginBaseOptionsSchema } from '../../src/plugin-loader/plugin-base.config';

const enabledSchema = pluginBaseOptionsSchema.extend({
  enabled: z.literal(true),
  channelID: z.string().nonempty(),
  requireConnectors: z.tuple([z.literal('discord')]),
}).describe("Log in game admin camera usage to a Discord channel.");

const schema = z.discriminatedUnion("enabled", [
  enabledSchema,
  pluginBaseOptionsSchema.extend({
    enabled: z.literal(false),
  }),
]);

export type DiscordAdminCamLogsEnabledOptions = z.infer<typeof enabledSchema>;

// Use a different schema for validation and for typing of the plugin, as only enabled plugin will have their main
// function called.
// noinspection JSUnusedGlobalSymbols
export default schema;
