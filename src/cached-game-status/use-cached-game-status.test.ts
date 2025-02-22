import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CachedGameStatus, Player, Squad, useCachedGameStatus } from './use-cached-game-status';
import { of } from 'rxjs';
import { RconSquad } from '../rcon-squad/use-rcon-squad';
import { merge, omit } from 'lodash-es';
import { DeepPartial } from '../utils';
import { wait } from '../utils';
import { UnassignedPlayer } from './use-helpers';

// We use Required, to make sure we have both RCON and logs data, let the test refine the data if needed.
const playerYuca: Required<UnassignedPlayer> = {
  controller: 'controller0',
  eosID: 'eosYuca',
  id: '0',
  ip: 'ipYuca',
  isLeader: false,
  name: 'Yuca',
  nameWithClanTag: '-TWS- Yuca',
  steamID: 'steamYuca',
  teamID: '1',
  role: 'WPMC_Engineer_01', // invented
};

function mockRconSquad(override: DeepPartial<RconSquad>): RconSquad {
  const base = {
    getSquads: vi.fn<any>().mockResolvedValue([]),
    getListPlayers: vi.fn<any>().mockResolvedValue([]),
    showServerInfo: vi.fn<any>().mockResolvedValue({}), // not this is invalid data for server info...
    // chatEvents: {
    //   message: of(),
    //   command: of(),
    //   possessedAdminCamera: of(),
    //   unPossessedAdminCamera: of(),
    //   playerWarned: of(),
    //   playerKicked: of(),
    //   squadCreated: of(),
    //   playerBanned: of(),
    // },
    // adminsInAdminCam: Promise.resolve(''),
    // ban: Promise.resolve(''),
    // broadcast: Promise.resolve(''),
    // connect: Promise.resolve(''),
    // disbandSquad: Promise.resolve(''),
    // disconnect: Promise.resolve(''),
    // forceTeamChange: Promise.resolve(''),
    // getCurrentMap: Promise.resolve(''),
    // getNextMap: Promise.resolve(''),
    // kick: Promise.resolve(''),
    // setFogOfWar: Promise.resolve(''),
    // warn: Promise.resolve('')
  } as any;

  return merge(base, override);
}

describe('use-cached-game-status', () => {
  beforeEach(async () => {
    // Clear previous mock calls and implementations
    vi.clearAllMocks();
  });

  it('should save log connected player', () => {
    const logObtainedPlayerYuca = {
      ...omit(playerYuca, 'nameWithClanTag', 'role'),
      squadIndex: undefined,
      squad: undefined,
    };
    const cachedGameStatus: CachedGameStatus = useCachedGameStatus({
      initialPlayers: [],
      initialSquads: [],
      initialServerInfo: {} as any,
      rconSquad: mockRconSquad({}),
      logParser: {
        events: {
          playerDisconnected: of(),
          newGame: of(),
        },
      } as any,
      addPlayer$: of(logObtainedPlayerYuca),
      config: {
        updateInterval: {
          playersAndSquads: 60,
          layerInfo: 60,
          serverInfo: 60,
        },
      },
    });

    cachedGameStatus.watch();
    cachedGameStatus.unwatch();

    expect(cachedGameStatus.players$.getValue()).toContainEqual(logObtainedPlayerYuca);
  });

  it('should save rcon players', async () => {
    const cachedGameStatus: CachedGameStatus = useCachedGameStatus({
      initialPlayers: [],
      initialSquads: [],
      initialServerInfo: {} as any,
      rconSquad: mockRconSquad({
        // getSquads: Promise.resolve([]),
        getListPlayers: () => Promise.resolve([playerYuca]),
      }),
      logParser: {
        events: {
          playerDisconnected: of(),
          newGame: of(),
        },
      } as any,
      addPlayer$: of(),
      config: {
        updateInterval: {
          playersAndSquads: 0.01,
          layerInfo: 1,
          serverInfo: 1,
        },
      },
    });
    cachedGameStatus.watch();

    await wait(100);

    cachedGameStatus.unwatch();

    expect(cachedGameStatus.players$.getValue()).toContainEqual(playerYuca);
  });

  it('should save rcon squads and assign squad to player', async () => {
    const squad = {
      creator: {
        eosID: playerYuca.eosID,
        name: playerYuca.name,
        steamID: playerYuca.steamID,
      },
      locked: false,
      size: 8,
      squadIndex: '2',
      name: 'Squad 2',
      teamID: playerYuca.teamID,
      teamName: 'Manticore Security Task Force',
    };
    const cachedGameStatus: CachedGameStatus = useCachedGameStatus({
      initialPlayers: [],
      initialSquads: [],
      initialServerInfo: {} as any,
      rconSquad: mockRconSquad({
        getSquads: () => Promise.resolve<Squad[]>([squad]),
        getListPlayers: () =>
          Promise.resolve<Player[]>([
            {
              ...playerYuca,
              squadIndex: '2',
            },
          ]),
      }),
      logParser: {
        events: {
          playerDisconnected: of(),
          newGame: of(),
        },
      } as any,
      addPlayer$: of(),
      config: {
        updateInterval: {
          playersAndSquads: 0.01,
          layerInfo: 1,
          serverInfo: 1,
        },
      },
    });
    cachedGameStatus.watch();

    await wait(100);

    cachedGameStatus.unwatch();

    expect(cachedGameStatus.squads$.getValue()).toContainEqual(squad);
    expect(cachedGameStatus.players$.getValue()).toContainEqual({
      ...playerYuca,
      squadIndex: '2',
      squad,
    });
  });
});
