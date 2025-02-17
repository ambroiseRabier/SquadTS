import { it, describe, expect } from 'vitest';
import { usePlayerGet } from './use-player-get';
import { Player } from './use-cached-game-status';

describe('use-player-get', () => {
  // to be included everywhere, make sure you don't just send first array value back.
  const anotherPlayer = {
    name: 'NeverMatchMe',
    nameWithClanTag: 'NeverMatchMe',
    eosID: 'eos9999',
  };

  it('Find player (normal happy case)', () => {
    const mockData: Pick<Player, 'name' | 'nameWithClanTag' | 'eosID'>[] = [
      {
        name: 'Yuca',
        nameWithClanTag: '-TWS- Yuca',
        eosID: 'eos0',
      },
      {
        name: undefined,
        nameWithClanTag: '-TWS- Amo',
        eosID: 'eos1',
      },
      {
        name: 'Etira',
        nameWithClanTag: undefined,
        eosID: 'eos1',
      },
      anotherPlayer,
    ];
    const pg = usePlayerGet(() => mockData as any); // as any because we don't need the full Player for the tests

    // Explicit by name
    expect(pg.getPlayersByName('Yuca')).toEqual([mockData[0]]);
    expect(pg.tryGetPlayerByName('Yuca')).toEqual(mockData[0]);

    // Explicit by name with clan tag
    expect(pg.getPlayersByNameWithClanTag('-TWS- Yuca')).toEqual([mockData[0]]);
    expect(pg.tryGetPlayerByNameWithClanTag('-TWS- Yuca')).toEqual(mockData[0]);
  });

  it('No clan tag', () => {
    const mockData: Pick<Player, 'name' | 'nameWithClanTag' | 'eosID'>[] = [
      {
        name: 'Yuca',
        nameWithClanTag: 'Yuca',
        eosID: 'eos0',
      },
      anotherPlayer,
    ];
    const pg = usePlayerGet(() => mockData as any); // as any because we don't need the full Player for the tests

    expect(pg.getPlayersByName('Yuca')).toEqual([mockData[0]]);
    expect(pg.getPlayersByNameWithClanTag('Yuca')).toEqual([mockData[0]]);
  });

  it('Same name, two different players', () => {
    const mockData: Pick<Player, 'name' | 'nameWithClanTag' | 'eosID'>[] = [
      {
        name: 'Yuca',
        nameWithClanTag: '-TWS- Yuca',
        eosID: 'eos0',
      },
      {
        name: 'Yuca',
        nameWithClanTag: '-TWS- Yuca',
        eosID: 'eos1',
      },
      anotherPlayer,
    ];
    const pg = usePlayerGet(() => mockData as any); // as any because we don't need the full Player for the tests

    // Cannot find a unique player, send nothing back.
    expect(pg.getPlayersByName('Yuca')).toEqual(mockData.slice(0, 2));
    expect(pg.getPlayersByNameWithClanTag('-TWS- Yuca')).toEqual(
      mockData.slice(0, 2)
    );
    expect(pg.tryGetPlayerByName('Yuca')).toEqual(undefined);
    expect(pg.tryGetPlayerByNameWithClanTag('-TWS- Yuca')).toEqual(undefined);
  });

  it('tryGetPlayerByName will match nameWithClanTag if no name found (SquadRCON.getListPlayers is up-to-date but logParser.playerConnected is not)', () => {
    const mockData: Pick<Player, 'name' | 'nameWithClanTag' | 'eosID'>[] = [
      {
        nameWithClanTag: 'Yuca',
        eosID: 'eos0',
      },
      anotherPlayer,
    ];
    const pg = usePlayerGet(() => mockData as any); // as any because we don't need the full Player for the tests

    expect(pg.tryGetPlayerByName('Yuca')).toEqual(mockData[0]);
  });

  it('tryGetPlayerByName will partial match nameWithClanTag', () => {
    const mockData: Pick<Player, 'name' | 'nameWithClanTag' | 'eosID'>[] = [
      {
        nameWithClanTag: '-TWS- Yuca',
        eosID: 'eos0',
      },
      {
        nameWithClanTag: 'Yuca -TWS-', // clan tag is always at the start, a simple includes will fail here
        eosID: 'eos1',
      },
      anotherPlayer,
    ];
    const pg = usePlayerGet(() => mockData as any); // as any because we don't need the full Player for the tests

    expect(pg.tryGetPlayerByName('Yuca')).toEqual(mockData[0]);
  });

  it('tryGetPlayerByName will return undefined if multiples partial match nameWithClanTag', () => {
    const mockData: Pick<Player, 'name' | 'nameWithClanTag' | 'eosID'>[] = [
      {
        nameWithClanTag: '-TWS- Yuca',
        eosID: 'eos0',
      },
      {
        nameWithClanTag: '-FR- Yuca',
        eosID: 'eos0',
      },
      anotherPlayer,
    ];
    const pg = usePlayerGet(() => mockData as any); // as any because we don't need the full Player for the tests

    expect(pg.tryGetPlayerByName('Yuca')).toEqual(undefined);
  });

  it('tryGetPlayerByNameWithClanTag will match name if no name found (logParser.playerConnected is up-to-date but SquadRCON.getListPlayers)', () => {
    const mockData: Pick<Player, 'name' | 'nameWithClanTag' | 'eosID'>[] = [
      {
        name: '-TWS- Yuca',
        eosID: 'eos0',
      },
      anotherPlayer,
    ];
    const pg = usePlayerGet(() => mockData as any); // as any because we don't need the full Player for the tests

    expect(pg.tryGetPlayerByNameWithClanTag('-TWS- Yuca')).toEqual(mockData[0]);
  });

  it('tryGetPlayerByNameWithClanTag return undefined if no match', () => {
    const mockData: Pick<Player, 'name' | 'nameWithClanTag' | 'eosID'>[] = [
      {
        name: 'Yuca',
        eosID: 'eos0',
      },
      {
        name: 'S- Yuca', // Just placing that here, if you would try a partial match, this one could match too
        eosID: 'eos1',
      },
      {
        name: 'uca', // and this one too...
        eosID: 'eos2',
      },
      anotherPlayer,
    ];
    const pg = usePlayerGet(() => mockData as any); // as any because we don't need the full Player for the tests

    expect(pg.tryGetPlayerByNameWithClanTag('-TWS- Yuca')).toEqual(undefined);
  });

  // name match another nameWithClanTag
  // {
  //   name: '[FR]Yuca',
  //     nameWithClanTag: '[FR]Yuca',
  //   eosID: 'eos0',
  // },
  // {
  //   name: 'Yuca',
  //     nameWithClanTag: '[FR]Yuca',
  //   eosID: 'eos1',
  // }
});
