import { Player } from '../../../src/cached-game-status/use-cached-game-status';
import { filter, map, tap, Observable } from 'rxjs';

export function trackBalanceChange(stream: Observable<Player[]>) {
  let previousBalance = "0v0";
  return stream.pipe(
    map(players => {
      const team1Count = players.filter(player => player.teamID === '1').length;
      const team2Count = players.filter(player => player.teamID === '2').length;
      return {team1Count, team2Count};
    }),
    map(({team1Count, team2Count}) => `${team1Count}v${team2Count}`),
    filter(newBalance => newBalance !== previousBalance),
    tap(newBalance => previousBalance = newBalance)
  );
}
