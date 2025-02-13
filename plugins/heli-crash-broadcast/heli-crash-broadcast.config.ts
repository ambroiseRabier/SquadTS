// noinspection JSUnusedGlobalSymbols

import { z } from 'zod';
import { pluginBaseOptionsSchema } from '../../src/plugin-loader/plugin-base.config';

const schema = pluginBaseOptionsSchema.extend({
  messages: z.array(
    z.string().nonempty().includes('%pilot%')
  ).nonempty().default(['%pilot% crash landed.'])
    .describe(
      'The messages to send to the server when someone crash land,\n' +
      '%pilot%is replaced by the pilot name.\n' +
      'Up to you to be creative and funny.'
    ),
}).describe(
  'Broadcast to the whole server that someone just crash landed.'
);

export type HeliCrashBroadCastOptions = z.infer<typeof schema>;

export default schema;

// If set, the plugin will only be loaded if the connectors are available.
// This means you won't have to deal with missing connectors errors.
export const requireConnectors = [];
