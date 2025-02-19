import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { LogParser } from '../log-parser/use-log-parser';
import { CachedGameStatus, Player, useCachedGameStatus } from './use-cached-game-status';
import { from, of, Subject } from 'rxjs';
import { Logger } from 'pino';
import { RconSquad } from '../rcon-squad/use-rcon-squad';
import { merge, omit, pick } from 'lodash-es';
import { DeepPartial, ObservableValue } from '../utils';
import { createMockLogger } from '../test-utils';
import { UnassignedPlayer } from './use-helpers';


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

/**
 * Helper to emulate player connecting observed by logs.
 */
function createMockLogParser(
  override: DeepPartial<LogParser>,
  connectedLogPlayer: Required<Player>[]
): LogParser {
  const mockLogParser: LogParser = {
    events: {
      loginRequest: from<
        Pick<ObservableValue<LogParser['events']['loginRequest']>, 'name' | 'eosID'>[]
      >(connectedLogPlayer.map(p => pick(p, ['name', 'eosID'] as const))),
      playerConnected: from<
        Pick<
          ObservableValue<LogParser['events']['playerConnected']>,
          'steamID' | 'eosID' | 'controller' | 'ip'
        >[]
      >(connectedLogPlayer.map(p => pick(p, ['steamID', 'eosID', 'controller', 'ip'] as const))),
      playerAddedToTeam: from<
        Pick<ObservableValue<LogParser['events']['playerAddedToTeam']>, 'name' | 'teamID'>[]
      >(connectedLogPlayer.map(p => pick(p, ['name', 'teamID'] as const))),
      playerInitialized: from<
        Pick<ObservableValue<LogParser['events']['playerInitialized']>, 'name' | 'id'>[]
      >(
        connectedLogPlayer.map(p => ({
          name: p.name,
          // since our mock player already has a correct ID, we need to make it wrong by adding the +1 the log do.
          // So that the result will be matching our mockPlayer in the end.
          id: (parseInt(p.id) + 1).toString(),
        }))
      ),
      playerJoinSucceeded: from<
        Pick<ObservableValue<LogParser['events']['playerJoinSucceeded']>, 'name'>[]
      >(connectedLogPlayer.map(p => pick(p, ['name'] as const))),
      playerDisconnected: of(),
      playerWounded: of(),
    },
  } as any;

  return merge(mockLogParser, override);
}

function mockRconSquad(override: DeepPartial<RconSquad>): RconSquad {
  const base = {
    getSquads: vi.fn<any>().mockResolvedValue([]),
    getListPlayers: vi.fn<any>().mockResolvedValue([]),
    showServerInfo: vi.fn<any>().mockResolvedValue({}), // not this is invalid data for server info...
    chatEvents: {
      message: of(),
      command: of(),
      possessedAdminCamera: of(),
      unPossessedAdminCamera: of(),
      playerWarned: of(),
      playerKicked: of(),
      squadCreated: of(),
      playerBanned: of(),
    },
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
    const cachedGameStatus: CachedGameStatus = useCachedGameStatus({
      rconSquad: mockRconSquad({}),
      logParser: createMockLogParser({}, [playerYuca]),
      config: {
        updateInterval: {
          playersAndSquads: 1000,
          layerInfo: 1000,
          serverInfo: 1000,
        },
      },
      logParserConfig: logParserConfig,
      logger: mockLogger,
      initialServerInfo: {} as any,
    });

    cachedGameStatus.watch();
    cachedGameStatus.unWatch();

    expect(cachedGameStatus.getters.getPlayerByEOSID(playerYuca.eosID)).toEqual(
      omit(playerYuca, 'nameWithClanTag', 'role') // only fields provided by logs
    );
  });

  it('playerWounded do not find victim with only logParser connect data', () => {
    const playerWounded$ = new Subject<ObservableValue<LogParser['events']['playerWounded']>>();
    const mockLogParser = createMockLogParser(
      {
        events: {
          playerWounded: playerWounded$,
        },
      },
      [playerYuca, playerPika]
    );

    const cachedGameStatus: CachedGameStatus = useCachedGameStatus({
      rconSquad: mockRconSquad({}),
      logParser: mockLogParser,
      config: {
        updateInterval: {
          playersAndSquads: 1000,
          layerInfo: 1000,
          serverInfo: 1000,
        },
      },
      logParserConfig,
      logger: mockLogger,
      initialServerInfo: {} as any,
    });

    cachedGameStatus.watch();

    let result: any = undefined;
    cachedGameStatus.events.playerWounded.subscribe(playerWounded => {
      result = playerWounded;
    });

    playerWounded$.next({
      damage: 30,
      attacker: {
        controller: playerYuca.controller,
        eosID: playerYuca.eosID,
        steamID: playerYuca.steamID,
      },
      victim: {
        nameWithClanTag: playerPika.nameWithClanTag,
      },
      weapon: 'weapon0',
      chainID: 'chain0',
      date: new Date(0),
    });

    cachedGameStatus.unWatch();

    expect(result).toEqual({
      // Since I got the player from the logs udpates, nameWithClanTag is unavailable.
      attacker: omit(playerYuca, 'nameWithClanTag', 'role'),
      damage: 30,
      victim: {
        nameWithClanTag: '-TWS- Pika',
      },
      weapon: 'weapon0',
      chainID: 'chain0',
      date: expect.any(Date),
    });
  });

  it('playerWounded find victim with only rcon data', async () => {
    const playerWounded$ = new Subject<ObservableValue<LogParser['events']['playerWounded']>>();
    const mockLogParser = createMockLogParser(
      {
        events: {
          playerWounded: playerWounded$,
        },
      },
      []
    );

    const rconPlayerList: Awaited<ReturnType<RconSquad['getListPlayers']>> = [
      {
        nameWithClanTag: playerYuca.nameWithClanTag,
        teamID: playerYuca.teamID,
        role: playerYuca.role,
        squadID: playerYuca.squadID,
        steamID: playerYuca.steamID,
        eosID: playerYuca.eosID,
        isLeader: playerYuca.isLeader,
        id: playerYuca.id,
      },
      {
        nameWithClanTag: playerPika.nameWithClanTag,
        teamID: playerPika.teamID,
        role: playerPika.role,
        squadID: playerPika.squadID,
        steamID: playerPika.steamID,
        eosID: playerPika.eosID,
        isLeader: playerPika.isLeader,
        id: playerPika.id,
      },
    ];

    // Make sure it is coherent with empty squad list.
    console.assert(!playerPika.squadID, 'playerPika should not be in a squad');
    console.assert(!playerYuca.squadID, 'playerYuca should not be in a squad');

    const rconSquads: Awaited<ReturnType<RconSquad['getSquads']>> = [];

    const cachedGameStatus: CachedGameStatus = useCachedGameStatus({
      rconSquad: mockRconSquad({
        // Using Promise.resolve(...) seems to break RXJS, it may have something to do with
        // the lodash merge being using in mockRconSquad
        getSquads: vi.fn<any>().mockResolvedValue(rconSquads),
        getListPlayers: vi.fn<any>().mockResolvedValue(rconPlayerList),
      }),
      logParser: mockLogParser,
      config: {
        updateInterval: {
          playersAndSquads: 1000,
          layerInfo: 1000,
          serverInfo: 1000,
        },
      },
      logParserConfig,
      logger: mockLogger,
      initialServerInfo: {} as any,
    });

    cachedGameStatus.watch();

    // starWith(0) used on RCON update loop, needs one frame to take effect
    await new Promise(resolve => setImmediate(resolve));

    let result: any = undefined;
    cachedGameStatus.events.playerWounded.subscribe(playerWounded => {
      result = playerWounded;
    });

    playerWounded$.next({
      damage: 30,
      attacker: {
        controller: playerYuca.controller,
        eosID: playerYuca.eosID,
        steamID: playerYuca.steamID,
      },
      victim: {
        nameWithClanTag: playerPika.nameWithClanTag,
      },
      weapon: 'weapon0',
      chainID: 'chain0',
      date: new Date(0),
    });

    cachedGameStatus.unWatch();

    expect(result).toEqual({
      // Since I got the player from the logs udpates, nameWithClanTag is unavailable.
      attacker: omit(playerYuca, ['name', 'ip']), // only field provided by RCON and playerWounded
      damage: 30,
      victim: omit(playerPika, ['name', 'ip', 'controller']),
      weapon: 'weapon0',
      chainID: 'chain0',
      date: expect.any(Date),
    });
  });

  // I mean... logs are always in the past, no ? (si peu de tail ou gros interval...)
  // Par contre, c une autre histoire de commencé playerWounded avant player connected.
  // Au pire, player déco bah rien se passe ?
  // Test, playerWounded, on a past log, on startup.

  // Test that playerWounded take an updated player after getPLayerList got called.

  // Two player with same name ?

  // plugin dev: Get player by EOSID but not found ?
  // plugin dev: get player with undefined (dev mistake will and should throw error !)

  // si un clan tag reproduit le nom d'un joueur ss tag...

  // log du passé player wounded ss login. et un playerList le contenant pas.

  // todo: test rcon avec actuel, et log du passé sur un player actuellement déco, devrait planté je pense.
});
