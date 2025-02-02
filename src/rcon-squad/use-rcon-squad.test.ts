import { expect, beforeEach, describe, it, jest } from '@jest/globals';
import { useRconSquad } from './use-rcon-squad';
import { Packet, Rcon } from '../rcon/rcon';
import { Subject } from 'rxjs';

jest.mock('../rcon/rcon');

// Note: there isn't much to test, perhaps I will remove it. (check execute sub part instead)
describe('rcon-squad', () => {
  let squadRcon: ReturnType<typeof useRconSquad>;
  let mockedRcon: jest.Mocked<Rcon>;

  beforeEach(() => {
    // Clear previous mock calls and implementations
    jest.clearAllMocks();

    mockedRcon = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      execute: jest.fn(),
      chatPacketEvent: new Subject<Packet>(),
    } as unknown as jest.Mocked<Rcon>;
    mockedRcon.connect.mockResolvedValue();
    mockedRcon.disconnect.mockResolvedValue();
    squadRcon = useRconSquad({
      trace: console.log,
      debug: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
    } as any, mockedRcon);
  });


  it('getCurrentMap', async () => {
    // const rconInstance = (Rcon as unknown as jest.Mocked<typeof Rcon>).mock.instances[0];
    mockedRcon.execute.mockResolvedValue("Current level is Sumari Bala, layer is Sumari_Seed_v1, factions INS WPMC");
    expect(await squadRcon.getCurrentMap()).toEqual({
      "layer": "Sumari_Seed_v1",
      "level": "Sumari Bala"
    });
  });
});
