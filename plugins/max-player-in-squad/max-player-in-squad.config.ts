// noinspection JSUnusedGlobalSymbols

import { z } from 'zod';
import { pluginBaseOptionsSchema } from '../../src/plugin-loader/plugin-base.config';

const schema = pluginBaseOptionsSchema.extend({
  squadTypes: z.array(
    z.object({
      containWord: z.string().describe(
        'The keyword that identifies the squad type. Case-insensitive.\n' +
        'E.g both "INF" or "inf" will validate "Infantry" or "INF".'),
      maxPlayers: z.number().min(1).max(9).describe('Maximum number of players for the given squad type.'),
    })
  )
    .nonempty()
    .default([{
      containWord: 'MBT',
      maxPlayers: 4
    }])
    .describe('List of squad types for which we limit player count'),
  message: z.string()
    .default(
      `Warning (%warn_count%) - Taille de la squad %squadType% trop grande, le max est %max%.`
    )
    .describe(
      'Message sent to the squad leader and entering squad member when max player count is exceeded.\n' +
      'Available variables: %warn_count%, %squadType%, %max%'
    ),
  warnRate: z.number()
    .int()
    .min(5)
    .default(60)
    .describe('In seconds, how often you want to warn the squad leader'),
  maxWarnBeforeDisband: z.number()
    .int()
    .min(1)
    .default(5)
    .describe(
      'How many times the squad leader can be warned before disbanding'
    ),
  enabledInSeed: z.boolean().default(false).describe('You most likely don\'t want this enabled in seed, unless for testing purposes.'),
}).describe(
  "Warn (then disband) squad leader, when player count is too high in his squad, based on squad name.\n" +
  "For example, most MBT (tank) squads are 4 players max, since tanks can only be manned by 4 players max.\n" +
  "Usually a MBT squad with more than 4 players means a bad squad lead (likely a new player) and infantry that will not play as a squad.");

export type MaxPlayerInSquadOptions = z.infer<typeof schema>;

export default schema;


// If set, the plugin will only be loaded if the connectors are available.
// This means you won't have to deal with missing connectors errors.
export const requireConnectors = [];

