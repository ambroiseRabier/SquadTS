import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { SquadServer, useSquadServer } from './squad-server';
import { Subject } from 'rxjs';
import { Rcon } from './rcon/rcon';

const sum = (a: number, b: number): number => a + b;

describe('Squad server', () => {
  let squadServer: SquadServer;
  let mockedRcon: jest.Mocked<Rcon>;

  beforeEach(() => {
    // Clear previous mock calls and implementations
    jest.clearAllMocks();

    squadServer = useSquadServer(
      {
        info: jest.fn(),
        debug: jest.fn()
      } as any, // mocking Logger
      {
        connect: jest.fn(),
        disconnect: jest.fn(),
        getListPlayers: jest.fn(() => Promise.resolve([]))
      } as any, // mocking RconSquad
      {
        events: new Subject(),
        watch: jest.fn(),
      } as any, // mocking LogParser
      {
        rcon: {
          host: '127.0.0.1',
          port: 21114
        }
      } as any  // mocking Options
    );
  });

  // This test is a bit special.
  // We are just making sure fields are available to plugins developer.
  // TS should not transpile if there is anything wrong, but once TS is fixed this test should always pass.
  it('dev API', async () => {
    // useSquadServer(jest.fn(), jest.fn(), jest.fn(), jest.fn())
    // expect(sum(1, 2)).toBe(3);
    await squadServer.rcon.getListPlayers();
    await squadServer.rcon.broadcast('hello');

    squadServer.events.adminBroadcast.subscribe((broad) => {
      broad.message
    });
    // todo test will pass if jest is not set to fail on missing expect ?
  });
})
