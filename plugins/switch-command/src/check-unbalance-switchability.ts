/**
 * After HANDLING switches that DO NOT CHANGE balance, we use this one to know how many switches we can perform
 * based on maxAllowedPlayerCountDiff and current balance.
 */
export function checkUnbalancedSwitchability(
  team1Count: number,
  team2Count: number,
  maxAllowedPlayerCountDiff: number
) {
  // ex: 50v49,
  // maxAllowedPlayerCountDiff min is 1,
  // team 1 allowed: 50 - 49 = 1 (can switch)
  // team 2 allowed: 49 - 50 = -1 (can't switch)
  // team 1 can switch once, but not team 2
  //
  // ex: 50v48
  // team 1 can switch once, 50v48 -> 49v49 (ok) -> 48v50 (not ok with maxAllowedPlayerCountDiff == 1)
  //
  // ex: 50v43
  // team 1 can switch 4 times -> 46v47
  //
  // ex: 50v42
  // team 1 can switch 4 times -> 46v46
  const a1 = Math.max(team1Count - team2Count, 0); // ex: 50-47 = 3
  const a2 = Math.max(team2Count - team1Count, 0);

  if (a1 > 0) {
    const b1 = Math.ceil(a1 / 2); // ex: ceil(1.5) == 2, 47-48 authorized
    const extra1 = a1 % 2 === 0 ? maxAllowedPlayerCountDiff - 1 : 0;
    return {
      maxTeam1MoveAllowed: b1 + extra1,
      maxTeam2MoveAllowed: 0,
    };
  }
  if (a2 > 0) {
    const b2 = Math.ceil(a2 / 2);
    const extra2 = a2 % 2 === 0 ? maxAllowedPlayerCountDiff - 1 : 0;
    return {
      maxTeam1MoveAllowed: 0,
      maxTeam2MoveAllowed: b2 + extra2,
    };
  }

  // Team are balanced, like 50v50
  return {
    maxTeam1MoveAllowed: 0,
    maxTeam2MoveAllowed: 0,
  };

  // return {
  //   maxTeam1MoveAllowed: extra1,
  //   maxTeam2MoveAllowed: extra2,
  // };
}
