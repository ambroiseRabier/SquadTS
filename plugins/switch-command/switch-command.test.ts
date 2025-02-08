import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import switchCommand from './switch-command';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { SwitchCommandConfig } from './switch-command.config';
import { SquadServer, useSquadServer } from '../../src/squad-server';
import { Player } from '../../src/cached-game-status/use-cached-game-status';


type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Utility type to infer the emitted type from an Observable
// Work like Awaited for promises
type ObservableValue<T> = T extends Observable<infer V> ? V : never;

// todo: maybe make a helpers to mock the server ?
// jest.mock('../../src/squad-server', () => {
//   // Input data comes from chatEvents.command
//   // and from player$
//   return {
//     rcon: {
//       forceTeamChange: jest.fn<any>().mockResolvedValue(undefined),
//       warn: jest.fn<any>().mockResolvedValue(undefined),
//     },
//     chatEvents: {
//       command: new Subject<ObservableValue<SquadServer['chatEvents']['command']>>(),
//     },
//     helpers: {
//       getOnlineAdminsWithPermissions: jest.fn(() => []),
//       getPlayerByEOSID: jest.fn(() => null),
//     },
//     players: [],
//     players$: of(),
//   }
// });

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// nameWithClanTag also for logs (typing like this is better than doing DeepPartial<Player>)
type SwitchCommandPlayer = Pick<Player, 'eosID' | 'teamID' | 'nameWithClanTag'>;

// Input data comes from chatEvents.command
// and from player$
const serverMock = () => {
  const players$ = new BehaviorSubject<SwitchCommandPlayer[]>([]);
  return {
    rcon: {
      forceTeamChange: jest.fn<SquadServer['rcon']['forceTeamChange']>().mockResolvedValue(undefined),
      warn: jest.fn<any>().mockResolvedValue(undefined),
    },
    chatEvents: {
      // Based on what the plugin use
      command: new Subject<Pick<ObservableValue<SquadServer['chatEvents']['command']>, 'command' | 'date'> & {player: SwitchCommandPlayer}>(),
    },
    helpers: {
      playerHasPermissions: jest.fn(() => false),
      getPlayerByEOSID: jest.fn(() => null),
    },
    get players() {
      return players$.getValue();
    },
    players$,
  };
};

// Will silently fail if any is missing.
const mockLogger = {
  trace: console.log,
  debug: console.log,
  info: console.log,
  log: console.log,
  warn: console.warn,
  error: console.error,
  fatal: console.error,
};

const mockOptions: SwitchCommandConfig = {
  enabled: true,
  loggerVerbosity: 'info',
  requireConnectors: [],
  command: '!switch',
  cooldown: 2, // 2sec cooldown or test will last forever !
  watchDuration: 300,
  maxAllowedPlayerCountDiff: 2,
  messages: {
    switch: 'You have been switched!',
    switchAdmin: 'Admin switch executed.',
    balanceWait: 'Cannot switch immediately.',
    onCooldown: 'Cooldown, wait X min.'
  }
};

const mockConnectors = {};

const emitSwitchCommand = (server: ReturnType<typeof serverMock>, eosID: string, teamID: '1' | '2') => {
  // Check yourself which properties are used in the plugin.
  server.chatEvents.command.next({
    command: mockOptions.command,
    player: { eosID, teamID },
    // Note: we remove old request, based on current date, unless the next part of the
    // code take more than 5min... using current date should be ok.
    date: new Date(),
  });
};

describe('switchCommand', () => {
  let server: ReturnType<typeof serverMock>;
  let plugin: Awaited<ReturnType<typeof switchCommand>>;

  beforeEach(async () => {
    server = serverMock();
    plugin = await switchCommand(
      server as any,
      mockConnectors as any,
      mockLogger as any,
      mockOptions
    );
  });

  it('switch player when balance does not worsen', async () => {
    // Set fake players
    server.players$.next([
      {
        eosID: 'eos1',
        teamID: '1',
      }
    ]);

    emitSwitchCommand(server, 'eos1', '1');

    expect(server.rcon.forceTeamChange).toHaveBeenCalledWith('eos1');
  });


  it('player respect cooldown', async () => {
    // Set fake players
    server.players$.next([
      {
        eosID: 'eos1',
        teamID: '1',
      }
    ]);
    emitSwitchCommand(server, 'eos1', '1');

    // Let promises of rcon.forceTeamChange and warn resolve first. (wait one tick)
    // ( 2 server.player$ emission in one tick never will happen )
    await wait(0);

    // Update server players, as player has changed team.
    server.players$.next([
      {
        eosID: 'eos1',
        teamID: '2',
      }
    ]);
    // Player ask for switch before cooldown.
    emitSwitchCommand(server, 'eos1', '2');

    // Don't get called twice !
    expect(server.rcon.forceTeamChange).not.toHaveBeenCalledTimes(2);

    // Wait cooldown
    // 100ms margin
    await wait(mockOptions.cooldown * 1000 + 100);

    // Player ask for switch after cooldown.
    emitSwitchCommand(server, 'eos1', '2');

    expect(server.rcon.forceTeamChange).toHaveBeenNthCalledWith(2, 'eos1');
  });

  it('player with TeamChange permission ignore cooldown', async () => {
    // Set fake players
    server.players$.next([
      {
        eosID: 'eos1',
        teamID: '1',
      }
    ]);

    emitSwitchCommand(server, 'eos1', '1');

    await wait(0);

    server.players$.next([
      {
        eosID: 'eos1',
        teamID: '2',
      }
    ]);
    server.helpers.playerHasPermissions.mockReturnValueOnce(true);
    emitSwitchCommand(server, 'eos1', '2');

    // Get called
    expect(server.rcon.forceTeamChange).toHaveBeenNthCalledWith(2, 'eos1');
  });

});

// test si joueur avec Balance sont immediat switch
// test si joueur avec Reserve sont prio meme avec date recente
// test si joueur avec date veille prio sur date recente
