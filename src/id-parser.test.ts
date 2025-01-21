import { describe, expect, test } from '@jest/globals';
import { extractIDsLower, extractIDsUpper } from './id-parser';

describe('ID Parser', () => {
  test('extractIDsLower', () => {
    expect(extractIDsLower('steam:id1 eos:id2')).toEqual({
      "eosID": "id2",
      "steamID": "id1"
    });
  });

  test('extractIDsUpper', () => {
    expect(extractIDsUpper('steam:id1 eos:id2')).toEqual({
      "EosID": "id2",
      "SteamID": "id1"
    });
  });

  test('handle extra space and arbitrary number of platform-id pairs', () => {
    expect(extractIDsUpper(' steam:id1 eos: id2    another  :  id3   ')).toEqual({
      "AnotherID": "id3",
      "EosID": "id2",
      "SteamID": "id1"
    });
  });

})
