// noinspection JSUnusedGlobalSymbols

import { z } from 'zod';
import { pluginBaseOptionsSchema } from '../../src/plugin-loader/plugin-base.config';
import { GithubWiki } from '../../src/github-info/github-layer.type';

const schema = pluginBaseOptionsSchema
  .extend({
    playerThreshold: z.number().min(0).max(100).default(30),
    duration: z
      .number()
      .min(1)
      .default(5)
      .describe(
        'How long player count has to stay bellow threshold to trigger map change. In minutes.'
      ),
    broadcastMessages: z.object({
      bellowThreshold: z
        .string()
        .default(
          'WARNING: Player count is bellow %playerThreshold% players, map will change in %duration% minutes.'
        )
        .describe(
          'Message to broadcast when player count goes bellow the threshold.\n' +
            'Variables:\n' +
            '- %playerThreshold% (e.g., "30")\n' +
            '- %duration% (e.g., "5")'
        ),
      beforeChangeMap: z
        .string()
        .default(
          'WARNING: The map will change to %nextLayer% in 10 seconds ! (player count is bellow %threshold%).'
        )
        .describe(
          'Will be called 10seconds before the map change. Each connected player will also be warned in addition of the broadcast.'
        ),
    }),
    seedLayers: z
      .array(z.enum(GithubWiki.mapAvailables))
      .default([
        'Sumari_Seed_v1',
        'Mutaha_Seed_v1',
        'Fallujah_Seed_v1',
        'BlackCoast_Seed_v1',
        'Tallil_Seed_v1',
        'Manicouagan_Seed_v1',
        'Logar_Seed_v1',
        'GooseBay_Seed_v1',
        'AlBasrah_Seed_v1',
        'Harju_Seed_v1',
        'PacificProvingGrounds_Seed_v1',
        'Sanxian_Seed_v1',
      ])
      .describe(
        'List of seed layers to choose from (randomly picked from the list). Available layers are:\n' +
          GithubWiki.mapAvailables.filter(l => l.toLowerCase().includes('seed')).join(', ')
      ),
  })
  .describe(
    'Change map to a seed layer when player count is low, this is different from LowPlayerCountThreshold in server settings, it does not wait for the end of the game (a game is 2h...)'
  );

export type AutoSeedLowPlayers = z.infer<typeof schema>;

export default schema;

// If set, the plugin will only be loaded if the connectors are available.
// This means you won't have to deal with missing connectors errors.
export const requireConnectors = [];
