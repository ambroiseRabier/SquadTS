import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { LogParser } from '../log-parser/use-log-parser';
import { CachedGameStatus, Player, useCachedGameStatus } from './use-cached-game-status';
import { from, Observable, of, Subject } from 'rxjs';
import { Logger } from 'pino';
import { RconSquad } from '../rcon-squad/use-rcon-squad';
import { merge, omit, pick } from 'lodash';
import { undefined } from 'zod';

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

type ObservableValue<T> = T extends Observable<infer V> ? V : never;

// ---- team 1 ----
const playerYuca: Required<Player> = {
  controller: "controller0",
  eosID: "eosYuca",
  id: "0",
  ip: "ipYuca",
  isLeader: false,
  name: "Yuca",
  nameWithClanTag: "-TWS- Yuca",
  squadID: null,
  steamID: "steamYuca",
  teamID: "1"
};

// ---- team 2 ----
const playerPika: Required<Player> = {
  controller: "controller0",
  eosID: "eosPika",
  id: "0", // if on another team, the id can be the same, it is called id by squad but work more like an index.
  ip: "ipPika",
  isLeader: false,
  name: "Pika",
  nameWithClanTag: "-TWS- Pika",
  squadID: null,
  steamID: "steamPika",
  teamID: "2"
};

/**
 * Helper to emulate player connecting observed by logs.
 */
function createMockLogParser(override: DeepPartial<LogParser>, connectedLogPlayer: Required<Player>[]): LogParser {
  const mockLogParser: LogParser = {
    events: {
      loginRequest: from<ObservableValue<LogParser['events']['loginRequest']>[]>(
        connectedLogPlayer.map(p => pick(p, ['name', 'eosID'] as const))
      ),
      playerConnected: from<ObservableValue<LogParser['events']['playerConnected']>[]>(
        connectedLogPlayer.map(p => pick(p, ['steamID', 'eosID', 'controller', 'ip'] as const))
      ),
      playerAddedToTeam: from<ObservableValue<LogParser['events']['playerAddedToTeam']>[]>(
        connectedLogPlayer.map(p => pick(p, ['name', 'teamID'] as const))
      ),
      playerInitialized: from<ObservableValue<LogParser['events']['playerInitialized']>[]>(
        connectedLogPlayer.map(p => ({
          name: p.name,
          // since our mock player already has a correct ID, we need to make it wrong by adding the +1 the log do.
          // So that the result will be matching our mockPlayer in the end.
          id: (parseInt(p.id) + 1).toString()
        }))
      ),
      playerJoinSucceeded: from<ObservableValue<LogParser['events']['playerJoinSucceeded']>[]>(
        connectedLogPlayer.map(p => pick(p, ['name'] as const))
      ),
      playerDisconnected: of(),
      playerWounded: of()
    }
  } as any;

  return merge(mockLogParser, override);
}

function mockRconSquad(): RconSquad {
  return {
    getSquads: jest.fn(),
    getListPlayers: jest.fn(),
    chatEvents: {
      message: of(),
      command: of(),
      possessedAdminCamera: of(),
      unPossessedAdminCamera: of(),
      playerWarned: of(),
      playerKicked: of(),
      squadCreated: of(),
      playerBanned: of()
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
  } as any
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
    // note: Any missing function will just make the test fail without any information.
    mockLogger = {
      trace: console.log,
      debug: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
    } as any;
  });

  beforeEach(async () => {
    // Clear previous mock calls and implementations
    jest.clearAllMocks();
  });

  it('should save log connected player', () => {
    const cachedGameStatus: CachedGameStatus = useCachedGameStatus(
      mockRconSquad(),
      createMockLogParser(
        {},
        [playerYuca]
      ),
      {
        updateInterval: {
          playersAndSquads: 1000,
          layerInfo: 1000,
          serverInfo: 1000,
        }
      },
      logParserConfig,
      mockLogger,
    );

    cachedGameStatus.watch();

    expect(
      cachedGameStatus.getPlayerByEOSID(playerYuca.eosID)
    ).toEqual(
      omit(playerYuca, 'nameWithClanTag')
    );
  });
  
  
  it('playerwounded do not find victim with only logParser connect data', () => {
    const playerWounded$ = new Subject<ObservableValue<LogParser['events']['playerWounded']>>();
    const mockLogParser = createMockLogParser({
        events: {
          playerWounded: playerWounded$
        }
      },
      [playerYuca, playerPika]
    );

    // todo subscribe immediat aux logs pas terrible pr test ?
    const cachedGameStatus: CachedGameStatus = useCachedGameStatus(
      mockRconSquad(),
      mockLogParser,
      {
        updateInterval: {
          playersAndSquads: 1000,
          layerInfo: 1000,
          serverInfo: 1000,
        }
      },
      logParserConfig,
      mockLogger,
    );

    cachedGameStatus.watch();

    let result: any = undefined;
    cachedGameStatus.events.playerWounded.subscribe(playerWounded =>  {
      result = playerWounded;
    });

    playerWounded$.next({
      damage: 30,
      attacker: {
        controller: playerYuca.controller,
        eosID: playerYuca.eosID,
        steamID: playerYuca.steamID
      },
      victim: {
        nameWithClanTag: playerPika.nameWithClanTag,
      },
      weapon: 'weapon0'
    });

    expect(result).toEqual({
      "attacker": {
        "controller": "controller0",
        "eosID": "eosYuca",
        "id": "0",
        "ip": "ipYuca",
        "isLeader": false,
        "name": "Yuca",
        "squadID": null,
        "steamID": "steamYuca",
        "teamID": "1"
      },
      "damage": 30,
      "victim": {
        "nameWithClanTag": "-TWS- Pika"
      },
      "weapon": "weapon0"
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
