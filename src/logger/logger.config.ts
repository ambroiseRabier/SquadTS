import { pino } from 'pino';
import { z } from 'zod';

// pino.levels output:
// { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 }
const logLevels = Object.keys(pino.levels.values);
const pinoLevelSchema = z.enum(logLevels as [string, ...string[]]);

export const loggerOptionsSchema = z.object({
  // todo replace by verbosity, more common english
  verboseness: z.object({
    SquadServer: pinoLevelSchema.default('info'),
    LogParser: pinoLevelSchema.default('info'),
    RCON: pinoLevelSchema.default('info'),
    RCONSquad: pinoLevelSchema.default('info'),
    CachedGameStatus: pinoLevelSchema.default('info')
  }).describe(
    `Define the log levels for each logger, available levels: ${logLevels.join(', ')}.\n` +
    `To disable a logger, set it to silent.`),
  debugFTP: z.boolean().default(false).describe("Enable FTP/SFTP debug logs. Keep disabled unless you can't find the issue with FTP/SFTP."),
  debugLogMatching: z.object({
    enabled: z.boolean().default(false)
      .describe("Enable log matching debug logs, matched line will show as DEBUG, unmatched line will show as WARN.\n" +
        "verboseness.LogParser HAS TO BE set to 'debug' for this to work.\n" +
        "Use this to find test cases for log matching, or to find a potential new event create (after an update of Squad).\n" +
        "Warning: very verbose, only use in development."),
    ignoreRegexMatch: z.array(z.string()).default([
      '^LogEOS:',
      '^LogEOSNetworkAuth:',
      '^LogSquadCommon: SQCommonStatics Check Permissions',
      '^LogEOSAntiCheat::',
      '^LogSquad: RotorWashEffectListener::EndPlay \\(reason 0\\)',
      '^LogEOSSessionListening: Verbose: Session \'GameSession\'',
      '^LogSquadOnlineServices: Icmp ping failed',
      '^LogRCONServer: \\d+:FRCONSocket::CloseConnection\\(\\):',
      '^LogRCONServer: \\d+:FRCONSocket::Run\\(\\):',
    ])
      .describe("Regex used to match line that will be ignored instead of being logged as non matched line.\n" +
        "Reduce the verboseness by ignoring logs you know are not useful to us.\n" +
        "Use this with caution.")
  })


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
