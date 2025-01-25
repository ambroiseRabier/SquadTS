import { Options, parseConfig } from './parse-config';
import { describe, test, expect } from '@jest/globals';

describe('parseConfig', () => {
  test('ensure completed valid config is parsed', async () => {
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
      }
    };


    await expect(parseConfig(validConfig)).resolves.not.toThrow();
  });
});
