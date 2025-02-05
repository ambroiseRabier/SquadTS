import { z } from 'zod';
import { pino } from 'pino';

// pino.levels output:
// { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 }
const logLevels = Object.keys(pino.levels.values);

export const pluginBaseOptionsSchema = z.object({
  enabled: z
    .boolean()
    .default(true),

  loggerVerbosity: z
    .string()
    .default('info')
    .describe(
      `Available levels: ${logLevels.join(', ')}.\n` +
      `To disable a logger, set it to silent.`),

  requireConnectors: z
    .array(z.enum(['discord']))
    .describe('If set, the plugin will only be loaded if the connectors are available.\n' +
      "This means you won't have to deal with missing connectors errors."),
});

export type PluginBaseOptions = z.infer<typeof pluginBaseOptionsSchema>;
