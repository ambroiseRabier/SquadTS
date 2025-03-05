import { expect, beforeEach, describe, it, vi, Mocked } from 'vitest';
import { useRconSquad } from './use-rcon-squad';
import { Rcon } from '../rcon/use-rcon';
import { Packet } from '../rcon/use-packet-data-handler';
import { Subject } from 'rxjs';

vi.mock('../rcon/rcon');

// Note: there isn't much to test, perhaps I will remove it. (check execute sub part instead)
describe('rcon-squad', () => {
  let squadRcon: ReturnType<typeof useRconSquad>;
  let mockedRcon: Mocked<Rcon>;

  beforeEach(() => {
    // Clear previous mock calls and implementations
    vi.clearAllMocks();

    mockedRcon = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      execute: vi.fn(),
      chatPacketEvent: new Subject<Packet>(),
    } as unknown as Mocked<Rcon>;
    mockedRcon.connect.mockResolvedValue();
    mockedRcon.disconnect.mockResolvedValue();
    squadRcon = useRconSquad(
      {
        trace: console.log,
        debug: console.log,
        info: console.info,
        warn: console.warn,
        error: console.error,
      } as any,
      mockedRcon,
      // Note, as for now, config only used by mocked sub modules.
      {} as any
    );
  });

  it('getCurrentMap', async () => {
    // const rconInstance = (Rcon as unknown as jest.Mocked<typeof Rcon>).mock.instances[0];
    mockedRcon.execute.mockResolvedValue(
      'Current level is Sumari Bala, layer is Sumari_Seed_v1, factions INS WPMC'
    );
    expect(await squadRcon.getCurrentMap()).toEqual({
      layer: 'Sumari_Seed_v1',
      level: 'Sumari Bala',
    });
  });
});
