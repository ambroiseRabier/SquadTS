import { z } from 'zod';
import { pluginBaseOptionsSchema } from '../../src/plugin-loader/plugin-base.config';

const enabledSchema = pluginBaseOptionsSchema.extend({
  enabled: z.literal(true),
  channelID: z.string().nonempty(),
  requireConnectors: z.tuple([z.literal('discord')]),
  command: z.string().default('admin').describe('The command that calls an admin.'),
  messages: z.object({
    noMessage: z.string().default('Please specify what you would like help with when requesting an admin.'),
  })
}).describe("Log real time squad chat to Discord.");

const schema = z.discriminatedUnion("enabled", [
  enabledSchema,
  pluginBaseOptionsSchema.extend({
    enabled: z.literal(false),
  }),
]);

export type DiscordAdminRequestEnabledOptions = z.infer<typeof enabledSchema>;

// Use a different schema for validation and for typing of the plugin, as only enabled plugin will have their main
// function called.
// noinspection JSUnusedGlobalSymbols
export default schema;
