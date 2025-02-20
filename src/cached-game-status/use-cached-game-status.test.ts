import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CachedGameStatus, Player, Squad, useCachedGameStatus } from './use-cached-game-status';
import { of } from 'rxjs';
import { Logger } from 'pino';
import { RconSquad } from '../rcon-squad/use-rcon-squad';
import { merge, omit } from 'lodash-es';
import { DeepPartial } from '../utils';
import { createMockLogger, wait } from '../test-utils';
import { UnassignedPlayer, useHelpers } from './use-helpers';

// ---- team 1 ----
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

// ---- team 2 ----
const playerPika: Required<UnassignedPlayer> = {
  controller: 'controller0',
  eosID: 'eosPika',
  id: '0', // if on another team, the id can be the same, it is called id by squad but work more like an index.
  ip: 'ipPika',
  isLeader: false,
  name: 'Pika',
  nameWithClanTag: '-TWS- Pika',
  steamID: 'steamPika',
  teamID: '2',
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
  // todo idea: faire un gameStatus et cachedGameStatus ? euh non ?

  let mockLogger: Logger;
  let helpers: ReturnType<typeof useHelpers>;

  const logParserConfig = {
    logFile: 'mock.log',
    ftp: {
      host: 'localhost',
      port: 21,
      username: 'user',
      password: 'pass',
      fetchInterval: 300,
      initialTailSize: 1024,
    },
    mode: 'ftp',
  } as const;

  beforeAll(() => {
    mockLogger = createMockLogger() as any;
  });

  beforeEach(async () => {
    // Clear previous mock calls and implementations
    vi.clearAllMocks();
  });

  it('should save log connected player', () => {
    const logObtainedPlayerYuca = {
      ...omit(playerYuca, 'nameWithClanTag', 'role'),
      squadID: undefined,
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
        }
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
        }
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
      squadID: '2',
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
        getListPlayers: () => Promise.resolve<Player[]>([{
          ...playerYuca,
          squadID: '2'
        }]),
      }),
      logParser: {
        events: {
          playerDisconnected: of(),
          newGame: of(),
        }
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
      squadID: '2',
      squad,
    });
  });


});
