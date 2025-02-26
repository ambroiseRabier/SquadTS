// noinspection JSUnusedGlobalSymbols

import { z } from 'zod';
import { pluginBaseOptionsSchema } from '../../src/plugin-loader/plugin-base.config';

const enabledSchema = pluginBaseOptionsSchema.extend({
  enabled: z.literal(true),
  command: z
    .string()
    .startsWith('!', 'Command must start with !')
    .default('!switch')
    .describe('Call to switch to the opposite team.'),
  watchDuration: z
    .number()
    .min(0)
    .default(5 * 60)
    .describe('How long it will try to switch player to the opposite team.'),
  cooldown: z
    .number()
    .min(0)
    .default(20 * 60)
    .describe('How long to wait before a player can switch again.'),
  ignoreCooldownStartingUnbalance: z
    .number()
    .min(2)
    .default(4)
    .describe(
      'Allow to ignore cooldown if the player increase balance by switching.\n' +
        'A value of 2 allow team 1 in 51v49 to switch even if team 1 player is on cooldown, but do not allow switching if 50v49 is on cooldown.\n' +
        'The issue this solve, is exceptionally allowing more switches to urgently balance a game, even if that pose the risk of a \n' +
        'cheating (ghosting) by using his info from the previous team. As so, it is recommended to keep it somewhat high, like 6.\n' +
        'A value of 6 allow team 1 in 50v44 (or 40v34) scenario to switch one guy with cooldown, so that balance becomes 49v45.'
    ),
  maxAllowedPlayerCountDiff: z
    .number()
    .int()
    .min(1)
    .default(3)
    .describe(
      'Mimic NumPlayersDiffForTeamChanges from Server.cfg https://squad.fandom.com/wiki/Server_Configuration#Server.cfg\n' +
        'Maximum Allowed difference in player count between teams.\n' +
        'It is recommended to keep it in sync with Server.cfg, but it is not necessary.\n' +
        'Set to 1 to allow 50v49 -> 49v50\n' +
        'Set to 2 to allow 50v50 -> 49v51\n' +
        'Set to 3 to allow 49v50 -> 48v51\n' +
        'Set to 4 to allow 50v50 -> 48v52\n' +
        '...' +
        'Set to a high amount like 100 to allow team change regardless of balance (not recommended)\n' +
        'If set to 1, it will only switch players in 50v50 if there is a player on both team that want to switch.'
    ),
  messages: z.object({
    switch: z
      .string()
      .max(1200, 'A warn with more than 1200 is likely to be cut by the screen.')
      .default('Switched to the opposite team as per your request.')
      .describe('Message to send to the player when switching.'),
    switchAdmin: z
      .string()
      .max(1200, 'A warn with more than 1200 is likely to be cut by the screen.')
      .default(
        'Your request has been most graciously accommodated, and you have been respectfully moved to the opposite team.'
      )
      .describe('Message to send to the admin player with "Balance" permission when switching.'),
    balanceWait: z
      .string()
      .max(1200, 'A warn with more than 1200 is likely to be cut by the screen.')
      .default(
        'We cannot switch you right now due to balance, if a slot becomes available in the next %watchDuration%, you will be switched.'
      )
      .describe(
        'Message to send to the player when switching is not possible immediately, due to balance.'
      ),
    onCooldown: z
      .string()
      .max(1200, 'A warn with more than 1200 is likely to be cut by the screen.')
      .default(
        'We cannot switch you right now, please wait %cooldown% seconds before trying again.'
      )
      .describe(
        'Message to send to the player when switching is not possible immediately, due to cooldown.'
      ),
  }),
});

const schema = z
  .discriminatedUnion('enabled', [
    enabledSchema,
    pluginBaseOptionsSchema.extend({
      enabled: z.literal(false),
    }),
  ])
  .describe(
    "Allow switching to the opposite team with '!switch' command.\n" +
      'Quite useful since most players are not aware you can change team using the game UI...\n' +
      "It is also fire and forget, meaning you don't have to watch team balance yourself.\n"
  );

export type SwitchCommandConfig = z.infer<typeof enabledSchema>;

// Use a different schema for validation and for typing of the plugin, as only enabled plugin will have their main
// function called.
export default schema;

// If set, the plugin will only be loaded if the connectors are available.
// This means you won't have to deal with missing connectors errors.
export const requireConnectors = [];
