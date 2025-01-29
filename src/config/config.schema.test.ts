import { Options } from './config.schema';
import { describe, test, expect } from '@jest/globals';
import { optionsSchema } from './config.schema';

describe('parseConfig', () => {
  test('Ensure complete valid config is parsed with no errors', async () => {
    const validConfig: Options = {
      rcon: {
        autoReconnectDelay: 5000,
        host: '127.0.0.1',
        port: 25575,
        password: 'examplePassword'
      },
      logger: {
        verboseness: {
          LogParser: 'info',
          RCON: 'info',
          SquadServer: 'info'
        }
      },
      logParser: {
        logFile: 'C:/servers/squad_server/SquadGame/Saved/Logs',
        ftp: {
          host: '127.0.0.1',
          port: 21,
          username: 'exampleUser',
          password: 'examplePassword',
          fetchInterval: 5000,
          maxTempFileSize: 1048576
        },
        mode: 'ftp'
      }
    };


    await expect(optionsSchema.parse(validConfig)).resolves.not.toThrow();
  });
});
