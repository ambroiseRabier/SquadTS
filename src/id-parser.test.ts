import { describe, expect, test } from '@jest/globals';
import { extractIDs } from './id-parser';

describe('ID Parser', () => {
  test('extractIDs without prefix', () => {
    expect(extractIDs('steam:id1 eos:id2')).toEqual({
      "eosID": "id2",
      "steamID": "id1"
    });
  });

  test('extractIDs with prefix', () => {
    expect(extractIDs('steam:id1 eos:id2', 'creator')).toEqual({
      "creatorEosID": "id2",
      "creatorSteamID": "id1"
    });
  });

  test('handle extra space and arbitrary number of platform-id pairs', () => {
    expect(extractIDs(' steam:id1 eos: id2    another  :  id3   ')).toEqual({
      "anotherID": "id3",
      "eosID": "id2",
      "steamID": "id1"
    });
  });

})
