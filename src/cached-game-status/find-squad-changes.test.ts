import { expect, it, describe } from 'vitest';
import { findSquadChanges } from './find-squad-changes';
import { Player } from './use-cached-game-status';

describe('findSquadChanges', () => {
  it('player leave squad', () => {
    expect(
      findSquadChanges(
        [
          {
            eosID: 'Ana',
            squadIndex: 1,
            teamID: '1',
          } as unknown as Player,
        ],
        [
          {
            eosID: 'Ana',
            squadIndex: null,
            teamID: '1',
          } as unknown as Player,
        ]
      )
    ).toEqual([
      {
        eosID: 'Ana',
        squadIndex: null,
        teamID: '1',
      },
    ]);
  });

  it('player join squad', () => {
    // yeah, that's correct typing, but very verbose :/
    expect(
      findSquadChanges(
        [
          (<Partial<Player>>{
            eosID: 'Ana',
            squadIndex: undefined,
            teamID: '1',
          }) as unknown as Player,
        ],
        [
          {
            eosID: 'Ana',
            squadIndex: 1,
            teamID: '1',
          } as unknown as Player,
        ]
      )
    ).toEqual([
      {
        eosID: 'Ana',
        squadIndex: 1,
        teamID: '1',
      },
    ]);
  });

  it('player join squad of same index on the other team', () => {
    expect(
      findSquadChanges(
        [
          {
            eosID: 'Ana',
            squadIndex: 1,
            teamID: '1',
          } as unknown as Player,
        ],
        [
          {
            eosID: 'Ana',
            squadIndex: 1,
            teamID: '2',
          } as unknown as Player,
        ]
      )
    ).toEqual([
      {
        eosID: 'Ana',
        squadIndex: 1,
        teamID: '2',
      },
    ]);
  });

  it('should correctly merge previous fields', () => {
    expect(
      findSquadChanges(
        [
          {
            eosID: 'Ana',
            squadIndex: 1,
            teamID: '1',
            ip: '127.0.0.1', // extra field, given by logs
          },
        ] as any,
        [
          {
            eosID: 'Ana',
            squadIndex: undefined,
            teamID: '1',
          },
        ] as any
      )
    ).toEqual([
      {
        eosID: 'Ana',
        squadIndex: undefined,
        teamID: '1',
        ip: '127.0.0.1',
      },
    ]);
  });
});
