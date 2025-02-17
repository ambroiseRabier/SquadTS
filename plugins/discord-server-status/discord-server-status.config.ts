// noinspection JSUnusedGlobalSymbols

import { z } from 'zod';
import { pluginBaseOptionsSchema } from '../../src/plugin-loader/plugin-base.config';

const enabledSchema = pluginBaseOptionsSchema
  .extend({
    enabled: z.literal(true),
    channelID: z.string().nonempty(),
    updateFrequency: z.number().min(5).default(60),
    command: z
      .string()
      .default('!status')
      .describe('The command that calls the status.'),
    setBotStatus: z
      .boolean()
      .default(true)
      .describe("Whether to update the bot's status with server information."),
  })
  .describe('Use !status to get server status in Discord.');

const schema = z.discriminatedUnion('enabled', [
  enabledSchema,
  pluginBaseOptionsSchema.extend({
    enabled: z.literal(false),
  }),
]);

export type DiscordServerStatusOptions = z.infer<typeof enabledSchema>;

// Use a different schema for validation and for typing of the plugin, as only enabled plugin will have their main
// function called.
export default schema;

// If set, the plugin will only be loaded if the connectors are available.
// This means you won't have to deal with missing connectors errors.
export const requireConnectors = ['discord'];
