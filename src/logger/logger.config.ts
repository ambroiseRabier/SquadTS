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
    RCON: pinoLevelSchema.default('info').describe(
      "Set to debug to view every response made, trace to view every RCON call made.\n" +
      "You may use debugCondenseLogs in rcon config to reduce verboseness of some responses."
    ),
    RCONSquad: pinoLevelSchema.default('info'),
    CachedGameStatus: pinoLevelSchema.default('info'),
    PluginLoader: pinoLevelSchema.default('info'),
    AdminList: pinoLevelSchema.default('info'),
    LogReader: pinoLevelSchema.default('info').describe("Will also be used for FTP/SFTP debug logs if enabled."),
    GithubInfo: pinoLevelSchema.default('info'),
  }).describe(
    `Define the log levels for each logger, available levels: ${logLevels.join(', ')}.\n` +
    `To disable a logger, set it to silent.`),
  debugLogMatching: z.object({
    showMatching: z.boolean().default(false)
      .describe("Log matched logs, that will be turned into events. They show at DEBUG log level.\n" +
        "verboseness.LogParser HAS TO BE set to 'debug' for this to work.\n" +
        "Warning: very verbose, only use in development."),
    showNonMatching: z.boolean().default(false).describe("Log non matched logs. They show at WARN log level.\n" +
      "You can use this to find new logs, that could be turned into events !\n" +
      "If however, the log appear useless, you can add it to ignoreRegexMatch to reduce the verboseness.\n" +
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
      '^LogSquad: Warning: ASQWeapon::DealDamage was called but there was no valid actor or component.',
    ])
      .describe("Every non matched line that will be additionally tested, if it match it will not be logged.\n" +
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
