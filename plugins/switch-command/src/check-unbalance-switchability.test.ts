// prettier-ignore
// vertical alignement of toEqual make it more readable. But prettier can't know that.

import { describe, expect, it } from 'vitest';
import { checkUnbalancedSwitchability } from './check-unbalance-switchability';

describe('checkSwitchability', () => {
  it('maxAllowedPlayerCountDiff === 1, Team 1 too big', () => {
    expect(checkUnbalancedSwitchability(50, 50, 1)).toEqual({
      maxTeam1MoveAllowed: 0,
      maxTeam2MoveAllowed: 0,
    });
    expect(checkUnbalancedSwitchability(50, 49, 1)).toEqual({
      maxTeam1MoveAllowed: 1,
      maxTeam2MoveAllowed: 0,
    });
    expect(checkUnbalancedSwitchability(50, 48, 1)).toEqual({
      maxTeam1MoveAllowed: 1,
      maxTeam2MoveAllowed: 0,
    });
    expect(checkUnbalancedSwitchability(50, 47, 1)).toEqual({
      maxTeam1MoveAllowed: 2,
      maxTeam2MoveAllowed: 0,
    });
    expect(checkUnbalancedSwitchability(50, 46, 1)).toEqual({
      maxTeam1MoveAllowed: 2,
      maxTeam2MoveAllowed: 0,
    });
    expect(checkUnbalancedSwitchability(50, 45, 1)).toEqual({
      maxTeam1MoveAllowed: 3,
      maxTeam2MoveAllowed: 0,
    });
  });
  it('maxAllowedPlayerCountDiff === 1, Team 2 too big', () => {
    expect(checkUnbalancedSwitchability(50, 50, 1)).toEqual({
      maxTeam1MoveAllowed: 0,
      maxTeam2MoveAllowed: 0,
    });
    expect(checkUnbalancedSwitchability(49, 50, 1)).toEqual({
      maxTeam1MoveAllowed: 0,
      maxTeam2MoveAllowed: 1,
    });
    expect(checkUnbalancedSwitchability(48, 50, 1)).toEqual({
      maxTeam1MoveAllowed: 0,
      maxTeam2MoveAllowed: 1,
    });
    expect(checkUnbalancedSwitchability(47, 50, 1)).toEqual({
      maxTeam1MoveAllowed: 0,
      maxTeam2MoveAllowed: 2,
    });
    expect(checkUnbalancedSwitchability(46, 50, 1)).toEqual({
      maxTeam1MoveAllowed: 0,
      maxTeam2MoveAllowed: 2,
    });
    expect(checkUnbalancedSwitchability(45, 50, 1)).toEqual({
      maxTeam1MoveAllowed: 0,
      maxTeam2MoveAllowed: 3,
    });
  });

  it('maxAllowedPlayerCountDiff === 2, Team 1 too big', () => {
    expect(checkUnbalancedSwitchability(50, 50, 2)).toEqual({
      maxTeam1MoveAllowed: 0,
      maxTeam2MoveAllowed: 0,
    });
    expect(checkUnbalancedSwitchability(50, 49, 2)).toEqual({
      maxTeam1MoveAllowed: 1,
      maxTeam2MoveAllowed: 0,
    }); // 49v50 (ok), 48v51 (not ok)
    expect(checkUnbalancedSwitchability(50, 48, 2)).toEqual({
      maxTeam1MoveAllowed: 2,
      maxTeam2MoveAllowed: 0,
    }); // 49v49 (ok), 48v50 (ok)
    expect(checkUnbalancedSwitchability(50, 47, 2)).toEqual({
      maxTeam1MoveAllowed: 2,
      maxTeam2MoveAllowed: 0,
    }); // 49v48, 48v49, 47v50 (not ok)
    expect(checkUnbalancedSwitchability(50, 46, 2)).toEqual({
      maxTeam1MoveAllowed: 3,
      maxTeam2MoveAllowed: 0,
    });
    expect(checkUnbalancedSwitchability(50, 45, 2)).toEqual({
      maxTeam1MoveAllowed: 3,
      maxTeam2MoveAllowed: 0,
    });
  });
  it('maxAllowedPlayerCountDiff === 2, Team 2 too big', () => {
    expect(checkUnbalancedSwitchability(50, 50, 2)).toEqual({
      maxTeam1MoveAllowed: 0,
      maxTeam2MoveAllowed: 0,
    });
    expect(checkUnbalancedSwitchability(49, 50, 2)).toEqual({
      maxTeam1MoveAllowed: 0,
      maxTeam2MoveAllowed: 1,
    });
    expect(checkUnbalancedSwitchability(48, 50, 2)).toEqual({
      maxTeam1MoveAllowed: 0,
      maxTeam2MoveAllowed: 2,
    });
    expect(checkUnbalancedSwitchability(47, 50, 2)).toEqual({
      maxTeam1MoveAllowed: 0,
      maxTeam2MoveAllowed: 2,
    });
    expect(checkUnbalancedSwitchability(46, 50, 2)).toEqual({
      maxTeam1MoveAllowed: 0,
      maxTeam2MoveAllowed: 3,
    });
    expect(checkUnbalancedSwitchability(45, 50, 2)).toEqual({
      maxTeam1MoveAllowed: 0,
      maxTeam2MoveAllowed: 3,
    });
  });
});
