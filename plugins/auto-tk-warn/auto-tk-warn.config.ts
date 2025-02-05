import { z } from 'zod';
import { pluginBaseOptionsSchema } from '../../src/plugin-loader/plugin-base.config';

const autoTKWarnSchema = pluginBaseOptionsSchema.extend({
  // todo optional delay
  attackerMessage: z
    .string()
    .optional()
    .describe('The message to warn attacking players with.')
    .default('Please apologise for ALL TKs in ALL chat!'),

  victimMessage: z
    .string()
    .nullable()
    .optional()
    .describe('The message that will be sent to the victim. null value means no message sent.')
    .default(null),

  requireConnectors: z.tuple([]),
});

export type AutoTKWarnOptions = z.infer<typeof autoTKWarnSchema>;

// noinspection JSUnusedGlobalSymbols
export default autoTKWarnSchema;
