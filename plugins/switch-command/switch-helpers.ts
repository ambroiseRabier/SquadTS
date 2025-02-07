import { checkUnbalancedSwitchability } from './check-unbalance-switchability';

interface SwitchRequest {
  eosID: string;
  date: Date;
}

/**
 * Expect reqTeam1 and reqTeam2 to be sorted.
 */
export function balanceIncreaseSwitch(reqTeam1: SwitchRequest[], reqTeam2: SwitchRequest[]): string[] {
  // request 4 and 7, we can switch 4 players without worrying about balance changes.
  const balancePreservedAllowedSwitch = Math.min(reqTeam1.length, reqTeam2.length);
  const switchPlayers: string[] = [];

  // Switch players that will not change balance
  for (let i = 0; i < balancePreservedAllowedSwitch; i++) {
    switchPlayers.push(
      reqTeam1[i].eosID,
      reqTeam2[i].eosID
    );
  }
  return switchPlayers;
}

/**
 * Expect reqTeam1 and reqTeam2 to be sorted.
 */
export function unbalanceSwitch(p: {
  reqTeam1: SwitchRequest[];
  reqTeam2: SwitchRequest[];
  team1Count: number;
  team2Count: number;
  maxAllowedPlayerCountDiff: number;
}): string[] {
  if (p.reqTeam1.length !== 0 && p.reqTeam2.length !== 0) {
    throw new Error('At least reqTeam1 and reqTeam2 must be empty, first use balanceIncreaseSwitch.');
  };

  const switchability = checkUnbalancedSwitchability(p.team1Count, p.team2Count, p.maxAllowedPlayerCountDiff);

  // We may be allowed up to 5 switch, but we may only have 2 players that want to switch
  const switchTeam1 = Math.min(switchability.maxTeam2MoveAllowed, p.reqTeam1.length);
  const switchTeam2 = Math.min(switchability.maxTeam1MoveAllowed, p.reqTeam2.length);

  return [
    ...p.reqTeam1.slice(0, switchTeam1).map(req => req.eosID),
    ...p.reqTeam2.slice(0, switchTeam2).map(req => req.eosID),
  ];
}
