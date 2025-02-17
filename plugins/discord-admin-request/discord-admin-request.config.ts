// noinspection JSUnusedGlobalSymbols

import { z } from 'zod';
import { pluginBaseOptionsSchema } from '../../src/plugin-loader/plugin-base.config';

const enabledSchema = pluginBaseOptionsSchema
  .extend({
    enabled: z.literal(true),
    channelID: z.string().nonempty(),
    command: z.string().default('admin').describe('The command that calls an admin.'),
    messages: z.object({
      noMessage: z
        .string()
        .default('Please specify what you would like help with when requesting an admin.'),
      noInGameAdminNotification: z
        .string()
        .default(
          'There are no in-game admins, however, an admin has been notified via Discord. Please wait for us to get back to you.'
        ),
      adminInGameNotification: z
        .string()
        .default('todo - default to english for now to handle plural...'),
      neutralAdminNotification: z
        .string()
        .default('An admin has been notified. Please wait for us to get back to you.')
        .describe('Neutral message that will be shown if showInGameAdmins is false.'),
    }),
    showInGameAdmins: z
      .boolean()
      .default(true)
      .describe('Inform player if there are in-game admins.'),
    debounceDiscordPing: z
      .number()
      .int()
      .min(0)
      .default(60)
      .describe('How many seconds to wait before Discord can be pinged again.'),
    pingHere: z
      .boolean()
      .default(true)
      .describe(
        'Ping @here. Great if Admin Requests are posted to a Squad Admin ONLY channel, allows pinging only Online Admins.'
      ),
    pingGroups: z
      .array(z.string().nonempty())
      .default([])
      .describe('A list of Discord role IDs to ping. Independent from pingHere.'),
  })
  .describe(
    'Ping admins in a Discord channel when a player requests an admin via the !admin command in in-game chat.'
  );

const schema = z.discriminatedUnion('enabled', [
  enabledSchema,
  pluginBaseOptionsSchema.extend({
    enabled: z.literal(false),
  }),
]);

export type DiscordAdminRequestEnabledOptions = z.infer<typeof enabledSchema>;

// Use a different schema for validation and for typing of the plugin, as only enabled plugin will have their main
// function called.
export default schema;

// If set, the plugin will only be loaded if the connectors are available.
// This means you won't have to deal with missing connectors errors.
export const requireConnectors = ['discord'];
