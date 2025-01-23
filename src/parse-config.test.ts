import { Options, parseConfig } from './parse-config';
import { describe, test, expect } from '@jest/globals';

describe('parseConfig', () => {
  test('valid config', async () => {
    const validConfig: Options = {
      rcon: {
        autoReconnectDelay: 5000,
        host: '127.0.0.1',
        port: 25575,
        password: 'examplePassword'
      }
    };


    await expect(parseConfig(validConfig)).resolves.not.toThrow();
  });
});
