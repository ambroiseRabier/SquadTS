import { SquadTSPlugin } from '../../src/plugin-loader/plugin.interface';
import { SwitchCommandConfig } from './switch-command.config';
import { filter } from 'rxjs';


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

interface SwitchRequest {
  eosID: string;
  date: Date;
}

// admin perms, balance: ignore balance, teamChange, ignore timer for reswitch
const SwitchCommand: SquadTSPlugin<SwitchCommandConfig> = async (server, connectors, logger, options) => {
  let switchRequestToTeam1: SwitchRequest[] = [];
  let switchRequestToTeam2: SwitchRequest[] = [];

  server.chatEvents.command.pipe(
    filter(data => data.command === options.command)
  ).subscribe(async (data) => {
    // Note: this favor player that do not spam switch, as spamming switch will reset your date and put
    //       you at the bottom of the queue


    // If team 1, you request to switch to team 2
    if (data.player.teamID === '1') {
      const req = switchRequestToTeam2.find(req => req.eosID === data.player.eosID);
      if (req) {
        // We update the date, but this put you last in queue, best bet for player is to call !switch again at the
        // end of watch duration. This punishes people for spamming switch.
        req.date = data.date;
      } else {
        switchRequestToTeam2.push({
          eosID: data.player.eosID,
          date: data.date
        });
      }
    } else if (data.player.teamID === '2') {
      const req = switchRequestToTeam1.find(req => req.eosID === data.player.eosID);
      if (req) {
        req.date = data.date;
      } else {
        switchRequestToTeam1.push({
          eosID: data.player.eosID,
          date: data.date
        });
      }
    }
    await trySwitch();
  });

  server.players$.subscribe(
    async (players) => {
      await trySwitch();
    });


  async function trySwitch() {
    // Sort by earlier to later date. (asc)
    switchRequestToTeam1 = switchRequestToTeam1.sort((a, b) => a.date.getTime() - b.date.getTime());
    switchRequestToTeam2 = switchRequestToTeam2.sort((a, b) => a.date.getTime() - b.date.getTime());

    const ids = balanceIncreaseSwitch(switchRequestToTeam1, switchRequestToTeam2);

    for (let eosID of ids) {
      await server.rcon.forceTeamChange(eosID);
      await server.rcon.warn(eosID, options.messages.switch);
    }

    // request 4 and 7, we can switch 4 players without worrying about balance changes.
    const balancePreservedAllowedSwitch = Math.min(switchRequestToTeam1.length, switchRequestToTeam2.length);

    // Switch players that will not change balance
    for (let i = 0; i < balancePreservedAllowedSwitch; i++) {
      await server.rcon.forceTeamChange(switchRequestToTeam1[i].eosID);
      await server.rcon.warn(switchRequestToTeam1[i].eosID, options.messages.switch);
      await server.rcon.forceTeamChange(switchRequestToTeam2[i].eosID);
      await server.rcon.warn(switchRequestToTeam2[i].eosID, options.messages.switch);
    }

    // Remove switched players
    switchRequestToTeam1 = switchRequestToTeam1.slice(balancePreservedAllowedSwitch);
    switchRequestToTeam2 = switchRequestToTeam2.slice(balancePreservedAllowedSwitch);

    // Now, if we had 4 and 7 requests, we are left with 0, 3 requests
    const team1Count = server.players.filter(player => player.teamID === '1').length;
    const team2Count = server.players.filter(player => player.teamID === '2').length;
    const switchability = checkUnbalancedSwitchability(team1Count, team2Count, options.maxAllowedPlayerCountDiff);


    // We may be allowed up to 5 switch, but we may only have 2 players that want to switch
    const switchTeam1 = Math.min(switchability.maxTeam1MoveAllowed, switchRequestToTeam1.length);
    const switchTeam2 = Math.min(switchability.maxTeam2MoveAllowed, switchRequestToTeam2.length);
    for (let i = 0; i < switchTeam1; i++) {
      await server.rcon.forceTeamChange(switchRequestToTeam1[i].eosID);
    }
    for (let i = 0; i < switchTeam2; i++) {
      await server.rcon.forceTeamChange(switchRequestToTeam2[i].eosID);
    }

    // Remove switched players
    switchRequestToTeam1 = switchRequestToTeam1.slice(switchTeam1);
    switchRequestToTeam2 = switchRequestToTeam2.slice(switchTeam2);

  }

  // et reste a gerer, les admins avec droit spécial. voir prio
  // cooldowna sur switch
  // watchDuration, pr eviter de se faire surprendre par le switch. (écrit en minutes)
  // on disconnect enlever du watch
  // le joueur change par la game ou a travers un admin, je dois pas reswitch

}

export default SwitchCommand;
