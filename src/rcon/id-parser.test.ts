import { describe, expect, test } from 'vitest';
import { extractIDs } from './id-parser';

describe('ID Parser', () => {
  test('extractIDs', () => {
    expect(extractIDs('steam:id1 eos:id2')).toEqual({
      eosID: 'id2',
      steamID: 'id1',
    });
  });

  test('handle extra space and arbitrary number of platform-id pairs', () => {
    expect(extractIDs(' steam:id1 eos: id2    another  :  id3   ')).toEqual({
      anotherID: 'id3',
      eosID: 'id2',
      steamID: 'id1',
    });
  });
});
