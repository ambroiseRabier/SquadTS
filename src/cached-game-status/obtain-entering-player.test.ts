import { describe, expect, it, vi } from 'vitest';
import { LogParser } from '../log-parser/use-log-parser';
import { of } from 'rxjs';
import { omit } from 'lodash-es';
import { obtainEnteringPlayer } from './obtain-entering-player';
import { createMockLogger } from '../test-utils';
import { UnassignedPlayer } from './use-helpers';

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

// Note: Use log-parser.test.ts to get initial data.
describe('obtainEnteringPlayer', () => {
  it('return player', () => {
    const mockLogParser: LogParser['events'] = {
      loginRequest: of({
        chainID: '483',
        date: new Date(0),
        name: playerYuca.name,
        eosID: playerYuca.eosID,
      }),
      playerConnected: of({
        chainID: '206',
        date: new Date(0),
        eosID: playerYuca.eosID,
        ip: playerYuca.ip,
        controller: playerYuca.controller,
        steamID: playerYuca.steamID,
      }),
      playerAddedToTeam: of({
        chainID: '805',
        date: new Date(0),
        name: playerYuca.name,
        teamID: playerYuca.teamID,
      }),
      playerInitialized: of({
        chainID: '805',
        date: new Date(0),
        name: playerYuca.name,
        // since our mock player already has a correct ID, we need to make it wrong by adding the +1 the log do.
        // So that the result will be matching our mockPlayer in the end.
        id: (parseInt(playerYuca.id) + 1).toString(),
      }),
      playerJoinSucceeded: of({
        chainID: '469',
        date: new Date(0),
        name: playerYuca.name,
      }),
      playerDisconnected: of(),
      playerWounded: of(),
    } as any;

    const addPlayer$ = obtainEnteringPlayer(
      mockLogParser,
      {
        mode: 'ftp',
        ftp: {
          fetchInterval: 1
        }
      } as any,
      createMockLogger() as any
    );

    const mockSub = vi.fn();
    addPlayer$.subscribe(mockSub);

    // Using toEqual instead of toHaveBeenCalledWith has better IDE support with diff.
    expect(mockSub.mock.calls[0][0]).toEqual({
      ...omit(playerYuca, ['nameWithClanTag', 'role']),
      squad: undefined,
      squadID: undefined,
    });
  });
});
