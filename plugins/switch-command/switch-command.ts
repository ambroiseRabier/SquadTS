import { SquadTSPlugin } from '../../src/plugin-loader/plugin.interface';
import { SwitchCommandConfig } from './switch-command.config';
import { filter } from 'rxjs';
import { checkUnbalancedSwitchability } from './check-unbalance-switchability';
import { AdminPerms } from '../../src/admin-list/permissions';
import { balanceIncreaseSwitch } from './switch-helpers';







// admin perms, balance: ignore balance, teamChange, ignore timer for reswitch
const SwitchCommand: SquadTSPlugin<SwitchCommandConfig> = async (server, connectors, logger, options) => {
  let switchRequestToTeam1: SwitchRequest[] = [];
  let switchRequestToTeam2: SwitchRequest[] = [];

  // Check if a player has Reserve permission
  const hasReservePermission = (eosID: string) =>
    server.helpers.getOnlineAdminsWithPermissions([AdminPerms.Reserve])
      .some(admin => admin.player.eosID === eosID);

  // Sorting function prioritizing Reserve, followed by date asc (oldest first)
  const sortRequests = (requests: SwitchRequest[]) =>
    requests.sort((a, b) =>
      Number(!hasReservePermission(a.eosID)) - Number(!hasReservePermission(b.eosID)) ||
      a.date.getTime() - b.date.getTime()
    );


  server.chatEvents.command.pipe(
    filter(data => data.command === options.command)
  ).subscribe(async (data) => {

    // Note: these peoples can also freely switch using game UI.
    const ignoreRules = server.helpers.getOnlineAdminsWithPermissions([AdminPerms.Balance])
      .some(admin => admin.player.eosID === data.player.eosID)

    if (ignoreRules) {
      await server.rcon.warn(data.player.eosID, options.messages.switchAdmin);
      // Do not track him, he is a free man.
      return;
    }


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

  // player connect, disconnect, change team (todo: player$ is much more...)
  server.players$.subscribe(
    async (players) => {
      await trySwitch();
    }
  );


  // todo: exhaustMap that. (don't want to start performing two different switch operation at the same time.
  //       finish this one, that will change current balance, before re-evaluating.
  async function trySwitch() {
    // Sort by earlier to later date. (asc)
    switchRequestToTeam1 = sortRequests(switchRequestToTeam1);
    switchRequestToTeam2 = sortRequests(switchRequestToTeam2);

    // Switch players that will not change balance
    // ex: we got 4 and 7 demands, we can switch 4 players without worrying about balance changes.
    const ids = balanceIncreaseSwitch(switchRequestToTeam1, switchRequestToTeam2);

    // Do not switch immediately before we calculated everything we need.

    // Remove ids we switched
    switchRequestToTeam1 = switchRequestToTeam1.filter(req => !ids.includes(req.eosID));
    switchRequestToTeam2 = switchRequestToTeam2.filter(req => !ids.includes(req.eosID));


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


    // Switch and inform selected players
    for (let eosID of ids) {
      await server.rcon.forceTeamChange(eosID);
      await server.rcon.warn(eosID, options.messages.switch);
    }
  }

  // et reste a gerer, les admins avec droit spécial. voir prio
  // cooldowna sur switch (filter)
  // watchDuration, pr eviter de se faire surprendre par le switch. (écrit en minutes)
  // on disconnect enlever du watch
  // le joueur change par la game ou a travers un admin, je dois pas reswitch

}

export default SwitchCommand;
