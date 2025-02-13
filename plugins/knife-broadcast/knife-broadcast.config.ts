// noinspection JSUnusedGlobalSymbols

import { z } from 'zod';
import { pluginBaseOptionsSchema } from '../../src/plugin-loader/plugin-base.config';

const schema = pluginBaseOptionsSchema.extend({
  messages: z.array(
    z.string().nonempty().includes('%attacker%').includes('%victim%')
  ).nonempty().default(['%victim% just got knifed by %attacker%'])
    .describe(
      'The messages to send to the server when someone gets knifed,\n' +
      '%attacker% and %victim% are replaced by the attacker and victim names.\n' +
      'Up to you to be creative and funny.'
    ),
  delay: z.number().int().min(0).default(5).describe('How many seconds to wait before broadcasting.'),
}).describe(
  'Broadcast to the whole server that someone just go knifed.'
);

export type KnifeBroadCastOptions = z.infer<typeof schema>;

export default schema;

// If set, the plugin will only be loaded if the connectors are available.
// This means you won't have to deal with missing connectors errors.
export const requireConnectors = [];
