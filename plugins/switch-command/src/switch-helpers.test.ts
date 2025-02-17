import { describe, expect, it } from 'vitest';
import { balanceIncreaseSwitch, unbalanceSwitch } from './switch-helpers';

interface SwitchRequest {
  eosID: string;
  date: Date;
}

describe('balanceIncreaseSwitch', () => {
  it('should handle unequal team sizes by limiting switches to the smaller array', () => {
    const reqTeam1: SwitchRequest[] = [
      { eosID: 'player1', date: new Date('2023-10-01') },
      { eosID: 'player2', date: new Date('2023-10-02') },
    ];

    const reqTeam2: SwitchRequest[] = [
      { eosID: 'player3', date: new Date('2023-10-01') },
    ];

    const result = balanceIncreaseSwitch(reqTeam1, reqTeam2);

    expect(result).toEqual(['player1', 'player3']); // Only match available pairs
  });
});

describe('unbalanceSwitch', () => {
  it('should throw if you have not properly prepared the data', () => {
    expect(() => {
      unbalanceSwitch({
        reqTeam1: [{ eosID: 'player1', date: new Date('2023-10-01') }],
        reqTeam2: [{ eosID: 'player2', date: new Date('2023-10-01') }],
        team1Count: 20,
        team2Count: 22,
        maxAllowedPlayerCountDiff: 4,
      });
    }).toThrow();
  });

  it('Allow all switch with maxAllowedPlayerCountDiff=infinite', () => {
    const reqTeam1: SwitchRequest[] = [
      { eosID: 'player1', date: new Date('2023-10-01') },
      { eosID: 'player2', date: new Date('2023-10-02') },
      { eosID: 'player5', date: new Date('2023-10-03') },
    ];

    const reqTeam2: SwitchRequest[] = [];

    const result = unbalanceSwitch({
      reqTeam1,
      reqTeam2,
      team1Count: 20,
      team2Count: 22,
      maxAllowedPlayerCountDiff: 10, // very high
    });

    const expected = ['player1', 'player2', 'player5'];
    expect(result).toEqual(expected);
  });

  it('allow only balance increasing switches with maxAllowedPlayerCountDiff=1', () => {
    const reqTeam1: SwitchRequest[] = [
      { eosID: 'player1', date: new Date('2023-10-01') },
      { eosID: 'player2', date: new Date('2023-10-02') },
      { eosID: 'player5', date: new Date('2023-10-03') },
    ];

    const reqTeam2: SwitchRequest[] = [];

    const result = unbalanceSwitch({
      reqTeam1,
      reqTeam2,
      team1Count: 20,
      team2Count: 22,
      maxAllowedPlayerCountDiff: 1,
    });

    const expected = ['player1'];
    expect(result).toEqual(expected);
  });

  it('allow some unbalance based on maxAllowedPlayerCountDiff=2', () => {
    const reqTeam1: SwitchRequest[] = [
      { eosID: 'player1', date: new Date('2023-10-01') },
      { eosID: 'player2', date: new Date('2023-10-02') },
      { eosID: 'player5', date: new Date('2023-10-03') },
    ];

    const reqTeam2: SwitchRequest[] = [];

    const result = unbalanceSwitch({
      reqTeam1,
      reqTeam2,
      team1Count: 20,
      team2Count: 22,
      maxAllowedPlayerCountDiff: 2,
    });

    const expected = ['player1', 'player2'];
    expect(result).toEqual(expected);
  });
});
