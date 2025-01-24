import { pino } from 'pino';
import { z } from 'zod';

// pino.levels output:
// { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 }
const logLevels = Object.keys(pino.levels.values);
const pinoLevelSchema = z.enum(logLevels as [string, ...string[]]);

export const loggerOptionsSchema = z.object({
  verboseness: z.object({
    SquadServer: pinoLevelSchema.default('info'),
    LogParser: pinoLevelSchema.default('info'),
    RCON: pinoLevelSchema.default('info')
  }).describe(`Define the log levels for each logger, available levels: ${logLevels.join(', ')}`),

  // todo: Not worth it ? Also need to provide proper error response if wrong color given.
  // colors: z.object({
  //     SquadServer: "yellowBright",
  //     SquadServerFactory: "yellowBright",
  //     LogParser: "blueBright",
  //     RCON: "redBright"
  //   }
  // ).describe("Personalize console colors for each logger, list of available colors can be found at: https://github.com/chalk/chalk")
});

export type LoggerOptions = z.infer<typeof loggerOptionsSchema>;
