import { describe, expect, it, vi } from 'vitest';
import { BehaviorSubject, of } from 'rxjs';
import { LogParser } from '../log-parser/use-log-parser';
import { CachedGameStatus } from './use-cached-game-status';
import { useRefinedLogEvents } from './use-refined-log-events';
import { UnassignedPlayer } from './use-helpers';
import { ObservableValue } from '../utils';

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


// Note: Use log-parser.test.ts to get initial data.

describe('UseRefinedLogEvents - playerWounded', () => {
  const playerWoundedEvent: ObservableValue<LogParser['events']['playerWounded']> = {
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
  };

  it('playerWounded is not called if duplicated player nameWithClanTag', () => {
    const logParser = {
      events: {
        playerWounded: of(playerWoundedEvent),
        playerDied: of({} as any),
        deployableDamaged: of({} as any),
        playerDisconnected: of({} as any),
      }
    } as LogParser;

    const cachedGameStatus = {
      // Do not use lodash merge as it modify original object !
      players$: new BehaviorSubject([playerYuca, {
        ...playerPika,
        nameWithClanTag: playerYuca.nameWithClanTag,
      }]),
    } as unknown as CachedGameStatus;
    const refined = useRefinedLogEvents({
      logParser,
      cachedGameStatus,
    });

    const mockSub = vi.fn();
    refined.playerWounded.subscribe(mockSub)
    expect(mockSub).not.toHaveBeenCalled();
  });

  it('playerWounded get augmented', () => {
    const logParser = {
      events: {
        playerWounded: of(playerWoundedEvent),
        playerDied: of({} as any),
        deployableDamaged: of({} as any),
        playerDisconnected: of({} as any),
      }
    } as LogParser;
    const cachedGameStatus = {
      players$: new BehaviorSubject([playerYuca, playerPika]),
    } as unknown as CachedGameStatus;
    const refined = useRefinedLogEvents({
      logParser,
      cachedGameStatus,
    });

    const mockSub = vi.fn();
    refined.playerWounded.subscribe(mockSub)
    expect(mockSub).toHaveBeenCalled();
    // Using toEqual instead of toHaveBeenCalledWith has better IDE support with diff.
    expect(mockSub.mock.calls[0][0]).toEqual({
      attacker: playerYuca,
      damage: 30,
      victim: playerPika,
      weapon: 'weapon0',
      chainID: 'chain0',
      date: expect.any(Date),
    });
  });
});

describe('UseRefinedLogEvents - playerDied', () => {
  const playerDiedEvent: ObservableValue<LogParser['events']['playerDied']> = {
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
  }

  it('playerDied is not called if duplicated player nameWithClanTag', () => {
    const logParser = {
      events: {
        playerDied: of(playerDiedEvent),
        playerWounded: of({} as any),
        deployableDamaged: of({} as any),
        playerDisconnected: of({} as any),
      }
    } as LogParser;
    const cachedGameStatus = {
      players$: new BehaviorSubject([playerYuca, {
        ...playerPika,
        nameWithClanTag: playerYuca.nameWithClanTag
      }]),
    } as unknown as CachedGameStatus;
    const refined = useRefinedLogEvents({
      logParser,
      cachedGameStatus,
    });

    const mockSub = vi.fn();
    refined.playerDied.subscribe(mockSub)
    expect(mockSub).not.toHaveBeenCalled();
  });

  it('playerDied get augmented', () => {
    const logParser = {
      events: {
        playerDied: of(playerDiedEvent),
        playerWounded: of({} as any),
        deployableDamaged: of({} as any),
        playerDisconnected: of({} as any),
      }
    } as LogParser;
    const cachedGameStatus = {
      players$: new BehaviorSubject([playerYuca, playerPika]),
    } as unknown as CachedGameStatus;
    const refined = useRefinedLogEvents({
      logParser,
      cachedGameStatus,
    });

    const mockSub = vi.fn();
    refined.playerDied.subscribe(mockSub)
    expect(mockSub).toHaveBeenCalled();
    // Using toEqual instead of toHaveBeenCalledWith has better IDE support with diff.
    expect(mockSub.mock.calls[0][0]).toEqual({
      attacker: playerYuca,
      damage: 30,
      victim: playerPika,
      weapon: 'weapon0',
      chainID: 'chain0',
      date: expect.any(Date),
    });
  });
});

describe('UseRefinedLogEvents - deployableDamaged', () => {

  const deployableDamagedEvent: ObservableValue<LogParser['events']['deployableDamaged']> = {
    chainID: '461',
    damage: 350,
    damageType: 'BP_Fragmentation_DamageType',
    date: expect.any(Date),
    deployable: 'BP_I_Sandbag_2',
    healthRemaining: 214.57,
    attackerName: playerYuca.name,
    weapon: 'BP_Mortarround4',
  };

  it('deployableDamaged is CALLED if duplicated player name', () => {
    const logParser = {
      events: {
        deployableDamaged: of(deployableDamagedEvent),
        playerWounded: of({} as any),
        playerDied: of({} as any),
        playerDisconnected: of({} as any),
      }
    } as LogParser;
    const cachedGameStatus = {
      players$: new BehaviorSubject([playerYuca, {
        ...playerPika,
        name: playerYuca.name
      }]),
    } as unknown as CachedGameStatus;
    const refined = useRefinedLogEvents({
      logParser,
      cachedGameStatus,
    });

    const mockSub = vi.fn();
    refined.deployableDamaged.subscribe(mockSub)
    // Yes, to have been called, since we have a fancy tryGetByName function that is able to resolve
    // player in some cases. And this is one of those case :).
    expect(mockSub).toHaveBeenCalled();
  });

  it('deployableDamaged get augmented', () => {
    const logParser = {
      events: {
        deployableDamaged: of(deployableDamagedEvent),
        playerWounded: of({} as any),
        playerDied: of({} as any),
        playerDisconnected: of({} as any),
      }
    } as LogParser;
    const cachedGameStatus = {
      players$: new BehaviorSubject([playerYuca, playerPika]),
    } as unknown as CachedGameStatus;
    const refined = useRefinedLogEvents({
      logParser,
      cachedGameStatus,
    });

    const mockSub = vi.fn();
    refined.deployableDamaged.subscribe(mockSub)
    expect(mockSub).toHaveBeenCalled();
    // Using toEqual instead of toHaveBeenCalledWith has better IDE support with diff.
    expect(mockSub.mock.calls[0][0]).toEqual({
      chainID: '461',
      damage: 350,
      damageType: 'BP_Fragmentation_DamageType',
      date: expect.any(Date),
      deployable: 'BP_I_Sandbag_2',
      healthRemaining: 214.57,
      attacker: playerYuca,
      weapon: 'BP_Mortarround4',
    });
  });
});

describe('UseRefinedLogEvents - playerDisconnected', () => {
  const playerDisconnectedEvent: ObservableValue<LogParser['events']['playerDisconnected']> = {
    chainID: '233',
    date: expect.any(Date),
    eosID: playerYuca.eosID,
    ip: '86.208.113.0',
    controller: 'BP_PlayerController_C_2130438728',
  };

  // playerDisconnected has eosID so it cannot not find the player
  it('playerDisconnected get augmented', () => {
    const logParser = {
      events: {
        playerDisconnected: of(playerDisconnectedEvent),
        playerWounded: of({} as any),
        playerDied: of({} as any),
        deployableDamaged: of({} as any),
      }
    } as LogParser;
    const cachedGameStatus = {
      players$: new BehaviorSubject([playerYuca, playerPika]),
    } as unknown as CachedGameStatus;
    const refined = useRefinedLogEvents({
      logParser,
      cachedGameStatus,
    });

    const mockSub = vi.fn();
    refined.playerDisconnected.subscribe(mockSub)
    // Using toEqual instead of toHaveBeenCalledWith has better IDE support with diff.
    expect(mockSub.mock.calls[0][0]).toEqual({
      player: {
        ...playerYuca,
        ip: '86.208.113.0',
        controller: 'BP_PlayerController_C_2130438728',
      },
      chainID: '233',
      date: expect.any(Date),
    });
  })

});
