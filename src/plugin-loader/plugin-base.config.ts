import { z } from 'zod';
import { pino } from 'pino';

// pino.levels output:
// { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 }
const logLevels = Object.keys(pino.levels.values);

export const pluginBaseOptionsSchema = z.object({
  loggerVerbosity: z
    .string()
    .default('warn')
    .describe(
      `Available levels: ${logLevels.join(', ')}.\n` +
      `To disable a logger, set it to silent.`),

  enabled: z
    .boolean()
    .default(true)
});

export type PluginBaseOptions = z.infer<typeof pluginBaseOptionsSchema>;
