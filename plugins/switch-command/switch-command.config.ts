import { z } from 'zod';
import { pluginBaseOptionsSchema } from '../../src/plugin-loader/plugin-base.config';

const enabledSchema = pluginBaseOptionsSchema.extend({
  enabled: z.literal(true),
  requireConnectors: z.tuple([]),
  command: z.string().default('!switch').describe('Call to switch to the opposite team.'),
  watchDuration: z.number().min(0).default(5*60).describe('How long it will try to switch player to the opposite team.'),
  cooldown: z.number().min(0).default(20*60).describe('How long to wait before a player can switch again.'),
  maxAllowedPlayerCountDiff: z.number().int().min(1).default(3)
    .describe(
      'Mimic NumPlayersDiffForTeamChanges from Server.cfg https://squad.fandom.com/wiki/Server_Configuration#Server.cfg\n' +
      'Maximum Allowed difference in player count between teams.\n' +
      'It is recommended to keep it in sync with Server.cfg, but it is not necessary.\n' +
      'Set to 1 to allow 50v49 -> 49v50\n' +
      'Set to 2 to allow 50v50 -> 49v51\n' +
      'Set to 3 to allow 49v50 -> 48v51\n' +
      'Set to 4 to allow 50v50 -> 48v52\n' +
      '...' +
      'Set to a high amount like 100 to allow team change regardless of balance (not recommended)\n'+
      'If set to 1, it will only switch players in 50v50 if there is a player on both team that want to switch.'
    ),
  messages: z.object({
    switch: z.string()
      .default('Switched to the opposite team as per your request.')
      .describe('Message to send to the player when switching.'),
    balanceWait: z.string()
      .default('We cannot switch you right now due to balance, if a slot becomes available in the next %watchDuration%, you will be switched.')
      .describe('Message to send to the player when switching is not possible immediately, due to balance.'),

  })
}).describe(
  "Allow to switch to the opposite team with '!switch' command.\n" +
  "Quite useful since most players are not aware you can change team using the game UI...\n" +
  "It is also fire and forget, meaning you don't have to watch team balance yourself.\n");

const schema = z.discriminatedUnion("enabled", [
  enabledSchema,
  pluginBaseOptionsSchema.extend({
    enabled: z.literal(false),
  }),
]);

export type SwitchCommandConfig = z.infer<typeof enabledSchema>;

// Use a different schema for validation and for typing of the plugin, as only enabled plugin will have their main
// function called.
// noinspection JSUnusedGlobalSymbols
export default schema;
