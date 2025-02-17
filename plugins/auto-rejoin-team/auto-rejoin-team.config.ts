// noinspection JSUnusedGlobalSymbols

import { z } from 'zod';
import { pluginBaseOptionsSchema } from '../../src/plugin-loader/plugin-base.config';

const schema = pluginBaseOptionsSchema
  .extend({
    trackDisconnectedFor: z
      .number()
      .min(1)
      .default(5)
      .describe('How many minutes to track disconnected players for.'),
    message: z
      .string()
      .nonempty()
      .default(
        'You have been reassigned to the team you were on before disconnecting.'
      )
      .describe(
        'The message to send to the player when he get switched back to his original team.'
      ),
  })
  .describe(
    'Your squad lead got disconnected, but when rejoining he got sent to the other team ? Wait no more, this plugin is for you !\n' +
      'This may also prevent a player from avoiding !switch cooldown by reconnecting and being put by the game on the other team.\n' +
      'Caution: if you get sent to the other team on connecting, it is likely due to balancing.'
  );

export type AutoRejoinOptions = z.infer<typeof schema>;

export default schema;

// If set, the plugin will only be loaded if the connectors are available.
// This means you won't have to deal with missing connectors errors.
export const requireConnectors = [];
