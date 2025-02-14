import { beforeAll, describe, it } from '@jest/globals';
import { TestServer, useTestServer } from '../../src/plugin-test-helper/plugin-test-helper';

describe('Heli crash broadcast', () => {
  let server: TestServer;
  beforeAll(async () => {
    server = await useTestServer();
  });

  it('Broadcast on heli crash', () => {
    server.rcon.getListPlayers.mockResolvedValue({});
  });
})
