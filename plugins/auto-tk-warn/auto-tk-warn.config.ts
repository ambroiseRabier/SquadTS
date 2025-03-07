// noinspection JSUnusedGlobalSymbols

import { z } from 'zod';
import { pluginBaseOptionsSchema } from '../../src/plugin-loader/plugin-base.config';

const schema = pluginBaseOptionsSchema
  .extend({
    // todo optional delay
    attackerMessage: z
      .string()
      .default('Please apologise for ALL TKs in ALL chat!')
      .describe('The message to warn attacking players with.'),

    // Is there any good reason to make this optional? It would just favorise unexcused TK.
    victimMessage: z
      .string()
      .default('%attackerName% team killed you.')
      .describe('The message that will be sent to the victim. null value means no message sent.'),

    attackerMessageDelay: z.number().int().min(0).default(5),
    victimMessageDelay: z.number().int().min(0).default(5),
  })
  .describe('Warn attacker/victim when they team kill.');

export type AutoTKWarnOptions = z.infer<typeof schema>;

export default schema;

// If set, the plugin will only be loaded if the connectors are available.
// This means you won't have to deal with missing connectors errors.
export const requireConnectors = [];
