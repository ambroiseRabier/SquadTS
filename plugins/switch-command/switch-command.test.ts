import { beforeEach, describe, expect, it, vi } from 'vitest';

import switchCommand from './switch-command';
import { BehaviorSubject, Subject } from 'rxjs';
import { SwitchCommandConfig } from './switch-command.config';
import { SquadServer } from '../../src/squad-server';
import { AdminPerms } from '../../src/admin-list/permissions';
import { ObservableValue } from '../../src/utils';
import { createMockLogger } from '../../src/test-utils';
import { Player } from '../../src/cached-game-status/use-cached-game-status';

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

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// nameWithClanTag also for logs (typing like this is better than doing DeepPartial<Player>)
type SwitchCommandPlayer = Pick<Player, 'eosID' | 'teamID' | 'nameWithClanTag'>;

// Input data comes from chatEvents.command
// and from player$
const serverMock = () => {
  const players$ = new BehaviorSubject<SwitchCommandPlayer[]>([]);
  return {
    rcon: {
      forceTeamChange: vi.fn<SquadServer['rcon']['forceTeamChange']>().mockResolvedValue(''), // resolved value is ignored
      warn: vi.fn<SquadServer['rcon']['warn']>().mockResolvedValue(''), // resolved value is ignored
    },
    chatEvents: {
      // Based on what the plugin use
      command: new Subject<
        Pick<ObservableValue<SquadServer['chatEvents']['command']>, 'command' | 'date'> & {
          player: SwitchCommandPlayer;
        }
      >(),
    },
    events: {
      playerDisconnected: new Subject<
        Pick<ObservableValue<SquadServer['events']['playerDisconnected']>, 'player'>
      >(),
    },
    helpers: {
      playerHasPermissions: vi.fn<SquadServer['helpers']['playerHasPermissions']>(() => false),
      getPlayerByEOSID: vi.fn((eosID: string) => players$.getValue().find(p => p.eosID === eosID)),
    },
    get players() {
      return players$.getValue();
    },
    players$,
  };
};

const mockLogger = createMockLogger();

const mockOptions: SwitchCommandConfig = {
  enabled: true,
  loggerVerbosity: 'info',
  command: '!switch',
  cooldown: 2, // 2sec cooldown or test will last forever !
  watchDuration: 300,
  maxAllowedPlayerCountDiff: 1, // Make it easier to test, there are others tests for bigger allowed diff
  ignoreCooldownStartingUnbalance: 3,
  messages: {
    switch: 'You have been switched!',
    switchAdmin: 'Admin switch executed.',
    balanceWait: 'Cannot switch immediately.',
    onCooldown: 'Cooldown, wait X min.',
  },
};

const mockConnectors = {};

// helper to keep things DRY and easier to read
const emitSwitchCommand = async (server: ReturnType<typeof serverMock>, eosID: string) => {
  const player = server.players.find(p => p.eosID === eosID);

  if (!player) {
    throw new Error(
      `Player ${eosID} not found, make sure you update server.players$ before calling this function in your test.`
    );
  }

  // Check yourself which properties are used in the plugin.
  server.chatEvents.command.next({
    command: mockOptions.command,
    player: {
      eosID,
      // Allows use not to have to provide teamID, it avoid providing the wrong teamID by mistake in tests !
      teamID: player.teamID,
    },
    // Note: we remove old request, based on current date, unless the next part of the
    // code take more than 5min... using current date should be ok.
    date: new Date(),
  });

  // Let promises of rcon.forceTeamChange and warn resolve first. (wait one tick)
  // ( 2 server.player$ emission in one tick never will happen )
  // if you don't do that, curiously, forceTeamChange.toHaveBeenCalled will be ok but no war.toHaveBeenCalled.
  await wait(0);
};

const emitDisconnect = async (server: ReturnType<typeof serverMock>, eosID: string) => {
  server.events.playerDisconnected.next({ player: { eosID } as any });
  await wait(0); // Not sure if it is necessary here
};

// helper to keep things DRY and easier to read
const addPlayerToGame = async (
  server: ReturnType<typeof serverMock>,
  player: SwitchCommandPlayer
) => {
  server.players$.next([...server.players$.getValue(), player]);

  // No need to re-emit switch, player is tracked.
  await wait(0); // let observable trigger any update...
};

describe('switchCommand', () => {
  let server: ReturnType<typeof serverMock>;
  // Unused yeah, but it feels really weird to just call await switchCommand to nowhere.
  // I don't want it to be garbage collected in the middle of the test ? (server should hold ref)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  it('switch player when balance does not worsen on team 1', async () => {
    // Set fake players
    server.players$.next([
      {
        eosID: 'eos1',
        teamID: '1',
      },
    ]);

    await emitSwitchCommand(server, 'eos1');

    expect(server.rcon.forceTeamChange).toHaveBeenCalledWith('eos1');
    expect(server.rcon.warn).toHaveBeenCalledWith('eos1', mockOptions.messages.switch);
  });

  it('switch player when balance does not worsen on team 2', async () => {
    // Set fake players
    server.players$.next([
      {
        eosID: 'eos1',
        teamID: '2',
      },
    ]);

    await emitSwitchCommand(server, 'eos1');

    expect(server.rcon.forceTeamChange).toHaveBeenCalledWith('eos1');
    expect(server.rcon.warn).toHaveBeenCalledWith('eos1', mockOptions.messages.switch);
  });

  it('do not switch player when balance worsen', async () => {
    server.players$.next([
      {
        eosID: 'eos1',
        teamID: '1',
      },
      {
        eosID: 'eos2',
        teamID: '2',
      },
    ]);

    await emitSwitchCommand(server, 'eos1');

    expect(server.rcon.forceTeamChange).not.toHaveBeenCalledWith('eos1');
    expect(server.rcon.warn).toHaveBeenCalledWith('eos1', mockOptions.messages.balanceWait);
  });

  it('switch player when balance worsen if player has Balance permission', async () => {
    server.players$.next([
      {
        eosID: 'eos1',
        teamID: '1',
      },
      {
        eosID: 'eos2',
        teamID: '2',
      },
    ]);
    server.helpers.playerHasPermissions.mockImplementationOnce((eosID, permissions) => {
      // Asking for balance permission and for eos1 player, then we say yes he has this permission.
      return eosID === 'eos1' && permissions[0] === AdminPerms.Balance;
    });

    await emitSwitchCommand(server, 'eos1');

    expect(server.rcon.forceTeamChange).toHaveBeenCalledWith('eos1');
  });

  it('switch tracked player later when balance allow it', async () => {
    server.players$.next([
      {
        eosID: 'eos1',
        teamID: '1',
      },
      {
        eosID: 'eos2',
        teamID: '2',
      },
    ]);

    await emitSwitchCommand(server, 'eos1');

    await addPlayerToGame(server, {
      eosID: 'eos3',
      teamID: '1',
    });

    // No need to re-emit switch, player is tracked.
    await wait(0); // let observable trigger any update...

    expect(server.rcon.forceTeamChange).toHaveBeenCalledWith('eos1');
  });

  it('tracked players get prioritized by permission reserve (whitelist) then date of !switch call asc', async () => {
    // 3v3
    server.players$.next([
      {
        eosID: 'eosReserveButLastSwitch',
        teamID: '1',
      },
      {
        eosID: 'eosFirstToSwitch',
        teamID: '1',
      },
      {
        eosID: 'eosSecondToSwitch',
        teamID: '1',
      },
      {
        eosID: 'eos1',
        teamID: '2',
      },
      {
        eosID: 'eos2',
        teamID: '2',
      },
      {
        eosID: 'eos3',
        teamID: '2',
      },
    ]);

    server.helpers.playerHasPermissions.mockImplementation((eosID, permissions) => {
      // Asking for balance permission and for eos1 player, then we say yes he has this permission.
      return eosID === 'eosReserveButLastSwitch' && permissions[0] === AdminPerms.Reserve;
    });

    await emitSwitchCommand(server, 'eosFirstToSwitch');
    await wait(10); // just wanna make sure date will be different
    await emitSwitchCommand(server, 'eosSecondToSwitch');
    await wait(10);
    await emitSwitchCommand(server, 'eosReserveButLastSwitch');

    // todo, soucis ici c plusieurs switch lancer en parralel je pense ?

    // 1 players joined team 1, so now it is 4v3, allowing one switch
    await addPlayerToGame(server, {
      eosID: 'eos4thPlayer',
      teamID: '1',
    });

    // Reserve get switched first, even if he used !switch last, seeder advantage :)
    // We also make sure it is the first ever call to forceTeamChange
    expect(server.rcon.forceTeamChange).toHaveBeenNthCalledWith(1, 'eosReserveButLastSwitch');

    // Update player list manually. 3v4 now
    server.players$.next([
      {
        eosID: 'eosFirstToSwitch',
        teamID: '1',
      },
      {
        eosID: 'eosSecondToSwitch',
        teamID: '1',
      },
      {
        eosID: 'eos4thPlayer',
        teamID: '1',
      },
      {
        eosID: 'eos1',
        teamID: '2',
      },
      {
        eosID: 'eos2',
        teamID: '2',
      },
      {
        eosID: 'eos3',
        teamID: '2',
      },
      {
        eosID: 'eosReserveButLastSwitch',
        teamID: '2',
      },
    ]);

    // another players joined team 1, so from 3v4 it is now 4v4
    await addPlayerToGame(server, {
      eosID: 'eos5thPlayer',
      teamID: '1',
    });

    // Balance won't allow 3v5, so we need to add two players in total, now it is 5v4, that allows another switch
    await addPlayerToGame(server, {
      eosID: 'eos6thPlayer',
      teamID: '1',
    });

    expect(server.rcon.forceTeamChange).toHaveBeenNthCalledWith(2, 'eosFirstToSwitch');
  });

  it('respect cooldown', async () => {
    // Set fake players
    server.players$.next([
      {
        eosID: 'eos1',
        teamID: '1',
      },
    ]);
    await emitSwitchCommand(server, 'eos1');

    // Update server players, as player has changed team.
    server.players$.next([
      {
        eosID: 'eos1',
        teamID: '2',
      },
    ]);
    // Player ask for switch before cooldown.
    await emitSwitchCommand(server, 'eos1');

    // Don't get called twice !
    expect(server.rcon.forceTeamChange).not.toHaveBeenCalledTimes(2);
    // But player get informed
    expect(server.rcon.warn).toHaveBeenCalledWith('eos1', mockOptions.messages.onCooldown);

    // Wait cooldown
    // 100ms margin
    await wait(mockOptions.cooldown * 1000 + 100);

    // Player ask for switch after cooldown.
    await emitSwitchCommand(server, 'eos1');

    expect(server.rcon.forceTeamChange).toHaveBeenNthCalledWith(2, 'eos1');
  });

  it('ignore cooldown if ignoreCooldownStartingUnbalance is crossed', async () => {
    // Set fake players
    server.players$.next([
      {
        eosID: 'eos1',
        teamID: '1',
      },
    ]);
    await emitSwitchCommand(server, 'eos1');

    // Update server players, as player has changed team.
    // also add 2 more players in team 2, so that balance is 0v3
    // and 3 - 0 is 3, and that is ignoreCooldownStartingUnbalance value.
    server.players$.next([
      {
        eosID: 'eos1',
        teamID: '2',
      },
      {
        eosID: 'eos2',
        teamID: '2',
      },
      {
        eosID: 'eos3',
        teamID: '2',
      },
    ]);
    // Player ask for switch before cooldown. And get accepted even though he is on cooldown.
    await emitSwitchCommand(server, 'eos1');

    // Called twice
    expect(server.rcon.forceTeamChange).toHaveBeenNthCalledWith(2, 'eos1');
  });

  it('player with TeamChange permission ignore cooldown', async () => {
    // Set fake players
    server.players$.next([
      {
        eosID: 'eos1',
        teamID: '1',
      },
    ]);

    server.helpers.playerHasPermissions.mockImplementation(
      (eosID, permissions) => eosID === 'eos1' && permissions[0] === AdminPerms.TeamChange
    );

    await emitSwitchCommand(server, 'eos1');

    server.players$.next([
      {
        eosID: 'eos1',
        teamID: '2',
      },
    ]);

    await emitSwitchCommand(server, 'eos1');

    // Get called
    expect(server.rcon.forceTeamChange).toHaveBeenNthCalledWith(2, 'eos1');
  });

  it('Does not switch a player after watch duration', async () => {
    const customWait = 1;
    server = serverMock();
    plugin = await switchCommand(server as any, mockConnectors as any, mockLogger as any, {
      ...mockOptions,
      watchDuration: customWait,
    });

    server.players$.next([
      {
        eosID: 'eos1',
        teamID: '1',
      },
      {
        eosID: 'eos2',
        teamID: '2',
      },
    ]);

    await emitSwitchCommand(server, 'eos1');

    await wait(customWait * 1000 + 100);

    // Add a player, 2v1, so switch is allowed.
    await addPlayerToGame(server, {
      eosID: 'eos3',
      teamID: '1',
    });

    // Not called because watchDuration expired, likely the player forgot he called switch and is playing in a squad.
    // Would be bad to switch a player.
    expect(server.rcon.forceTeamChange).not.toHaveBeenCalled();
  });

  it('Does not switch a player that disconnect', async () => {
    server.players$.next([
      {
        eosID: 'eos1',
        teamID: '1',
      },
      {
        eosID: 'eos2',
        teamID: '2',
      },
    ]);

    await emitSwitchCommand(server, 'eos1');

    // player disconnected (both player list and event disconnect is fired)
    await emitDisconnect(server, 'eos1');
    server.players$.next([
      {
        eosID: 'eos2',
        teamID: '2',
      },
    ]);

    await wait(0); // let observable trigger any update...

    // all good ? no errors ?
    // then proceed to add 2 new players
    server.players$.next([
      {
        eosID: 'eos3',
        teamID: '1',
      },
      {
        eosID: 'eos4',
        teamID: '1',
      },
      {
        eosID: 'eos2',
        teamID: '2',
      },
    ]);

    await wait(0); // let observable trigger any update...

    // Balance allow switch, but player that asked is disconnected
    expect(server.rcon.forceTeamChange).not.toHaveBeenCalled();
  });

  it('do not switch a player that already switched by another mean', async () => {
    server.players$.next([
      {
        eosID: 'eos1',
        teamID: '1',
      },
      {
        eosID: 'eos2',
        teamID: '2',
      },
    ]);

    await emitSwitchCommand(server, 'eos1');

    // unbalance in favor of team 2
    server.players$.next([
      {
        eosID: 'eos1',
        teamID: '2', // switched by admin or by himself through the game.
      },
      {
        eosID: 'eos2',
        teamID: '2',
      },
    ]);

    await wait(0); // let observable trigger any update...

    // unbalance in favor of team 1
    server.players$.next([
      {
        eosID: 'eos3',
        teamID: '1', // switched by admin or by himself through the game.
      },
      {
        eosID: 'eos4',
        teamID: '1', // switched by admin or by himself through the game.
      },
      {
        eosID: 'eos5',
        teamID: '2', // switched by admin or by himself through the game.
      },
      {
        eosID: 'eos1',
        teamID: '2', // switched by admin or by himself through the game.
      },
      {
        eosID: 'eos2',
        teamID: '2',
      },
    ]);

    await wait(0); // let observable trigger any update...

    expect(server.rcon.forceTeamChange).not.toHaveBeenCalledWith('eos1');
  });
});

//reste
// watchduration a tester
// disconnect, bien enlever du watch ?
