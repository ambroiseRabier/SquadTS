import { describe, expect, it } from '@jest/globals';
import { balanceIncreaseSwitch } from './switch-command';

describe('switchIncreaseSwitch', () => {
  const dateFixed = new Date(0);
  it('should balanceIncreaseSwitch', () => {
    expect(balanceIncreaseSwitch([
      {
        eosID: 'a',
        date: dateFixed
      },
      {
        eosID: 'b',
        date: dateFixed
      }
    ], [
      {
        eosID: 'c',
        date: dateFixed
      },
    ])).toEqual([
      'a', 'c'
    ]);
  });
})

// test si joueur avec Balance sont immediat switch
// test si joueur avec Reserve sont prio meme avec date recente
// test si joueur avec date veille prio sur date recente
