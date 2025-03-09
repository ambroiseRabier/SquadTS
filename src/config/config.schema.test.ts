import { Options, optionsSchema } from './config.schema';
import { describe, expect, test } from 'vitest';

describe('parseConfig', () => {
  test('Ensure complete valid config is parsed with no errors', async () => {
    const validConfig: Options = {
      rcon: {
        host: '127.0.0.1',
        port: 25575,
        password: 'examplePassword',
        debugCondenseLogs: false,
        debugCondenseLogsFurther: false,
        proxy: {
          enabled: false,
          port: 25576,
          password: 'examplePassword',
        },
      },
      logger: {
        verbosity: {
          LogParser: 'info',
          RCON: 'info',
          SquadServer: 'info',
          PluginLoader: 'info',
          RCONSquad: 'info',
          LogReader: 'info',
          GithubInfo: 'info',
          RCONProxyLogger: 'info',
        },
        debugLogMatching: {
          showMatching: false,
          showNonMatching: false,
          ignoreRegexMatch: ['^LogEOS:'],
        },
      },
      logParser: {
        configDir: 'C:/servers/squad_server/SquadGame/ServerConfig',
        logFile: 'C:/servers/squad_server/SquadGame/Saved/Logs',
        ftp: {
          host: '127.0.0.1',
          port: 21,
          username: 'exampleUser',
          password: 'examplePassword',
          fetchInterval: 5000,
          initialTailSize: 1048576,
        },
        mode: 'ftp',
      },
      cacheGameStatus: {
        updateInterval: {
          serverInfo: 1000,
          layerInfo: 1000,
          playersAndSquads: 1000,
        },
      },
      rconSquad: {
        dryRun: false,
      },
      connectors: {
        discord: {
          enabled: true,
          // fake token.
          token: 'NDc5ODU5NzMxNTY1NzU3ODky.Xxn6gQ.bogusPARTtoPASSregex-27long',
        },
      },
    };

    // await expect(optionsSchema.parse(validConfig)).resolves.not.toThrow(); // jest only ? or always was wrong ? -> parseAsync ?
    expect(() => optionsSchema.parse(validConfig)).not.toThrow();
  });
});
