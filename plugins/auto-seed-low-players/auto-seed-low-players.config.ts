// noinspection JSUnusedGlobalSymbols

import { z } from 'zod';
import { pluginBaseOptionsSchema } from '../../src/plugin-loader/plugin-base.config';
import { GithubWiki } from '../../src/github-info/github-layer.type';

const schema = pluginBaseOptionsSchema.extend({
  playerThreshold: z
    .number()
    .min(0)
    .max(100)
    .default(30),
  duration: z
    .number()
    .min(1)
    .default(5)
    .describe('How long player count has to stay bellow threshold to trigger map change. In minutes.'),
  broadcastMessages: z.object({
    bellowThreshold: z
      .string()
      .default('Player count is bellow %playerThreshold% players, map will change in %duration% minutes.'),
    beforeChangeMap: z
      .string()
      .default('The map will change to %nextLayer% because the player count is bellow %threshold% players in 10 seconds.')
      .describe('Will be called 10seconds before the map change. Each connected player will also be warned in addition of the broadcast.'),
  }),
  seedLayers: z.array(z.enum(GithubWiki.mapAvailables)).default([
    'Sumari_Seed_v1',
    'Sumari_Seed_v2',
    'Sumari_Seed_v3',
    'Sumari_Seed_v4',
  ]).describe(
    `List of seed layers to choose from (randomly picked from the list). Available layers are:\n` +
    (
      GithubWiki.mapAvailables
        .filter(l => l.toLowerCase().includes('seed'))
    ).join(', ')
  ),

}).describe('Change map to a seed layer when player count is low, this is different from LowPlayerCountThreshold in server settings, it does not wait for the end of the game (a game is 2h...)');

export type AutoSeedLowPlayers = z.infer<typeof schema>;

export default schema;

// If set, the plugin will only be loaded if the connectors are available.
// This means you won't have to deal with missing connectors errors.
export const requireConnectors = [];
