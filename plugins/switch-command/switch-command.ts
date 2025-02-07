import { SquadTSPlugin } from '../../src/plugin-loader/plugin.interface';
import { SwitchCommandConfig } from './switch-command.config';
import { concatMap, debounceTime, filter, tap } from 'rxjs';
import { AdminPerms } from '../../src/admin-list/permissions';
import { balanceIncreaseSwitch, SwitchRequest, unbalanceSwitch } from './switch-helpers';
import { Player } from '../../src/cached-game-status/use-cached-game-status';
import { trackBalanceChange } from './track-balance-change';


const SwitchCommand: SquadTSPlugin<SwitchCommandConfig> = async (server, connectors, logger, options) => {
  // We want to check for switch possibilities only when:
  // - The balance change in the game (player connected, disconnected, changed team)
  // - Another player call !switch

  let switchRequestToTeam1: SwitchRequest[] = [];
  let switchRequestToTeam2: SwitchRequest[] = [];
  const playerOnCooldown = new Map<string, Date>();

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
  
  function hasCooldown(eosID: string) {
    const cooldown = playerOnCooldown.get(eosID);
    
    if (!cooldown) {
      return false;
    }

    const now = new Date();
    const diff = now.getTime() - cooldown.getTime();
    if (diff < options.cooldown * 1000) {
      return true;
    } else {
      playerOnCooldown.delete(eosID);
      return false;
    }
  }

  function trackPlayer(player: Player, date: Date) {
    // If team 1, you request to switch to team 2
    if (player.teamID === '1') {
      const req = switchRequestToTeam2.find(req => req.eosID === player.eosID);
      if (req) {
        // We update the date, but this put you last in queue, best bet for player is to call !switch again at the
        // end of watch duration. This punishes people for spamming switch.
        req.date = date;
      } else {
        switchRequestToTeam2.push({
          eosID: player.eosID,
          date: date
        });
      }
    } else if (player.teamID === '2') {
      const req = switchRequestToTeam1.find(req => req.eosID === player.eosID);
      if (req) {
        req.date = date;
      } else {
        switchRequestToTeam1.push({
          eosID: player.eosID,
          date: date
        });
      }
    }
  }

  server.chatEvents.command.pipe(
    filter(data => data.command === options.command)
  ).subscribe(async (data) => {
    logger.info(`Player ${data.player.nameWithClanTag} (${data.player.eosID}) requested to switch`);

    // Note: these peoples can also freely switch using game UI.
    const ignoreRules = server.helpers.getOnlineAdminsWithPermissions([AdminPerms.Balance])
      .some(admin => admin.player.eosID === data.player.eosID)

    if (ignoreRules) {
      logger.info(`Switching admin ${data.player.nameWithClanTag} (${data.player.eosID})`)
      await server.rcon.forceTeamChange(data.player.eosID);
      await server.rcon.warn(data.player.eosID, options.messages.switchAdmin);
      // Do not track him, he is a free man.
      return;
    }

    if (!hasCooldown(data.player.eosID)) {
      trackPlayer(data.player, data.date); // todo, maybe data.time is nice, less confusing than e and a...
    }
    await trySwitch();
  });

  trackBalanceChange(server.players$).pipe(
    // Small debounce time to avoid spam at end/start of the game
    debounceTime(1000),
    filter(newBalance => switchRequestToTeam1.length > 0 || switchRequestToTeam2.length > 0),
    tap((newBalance) => {
      const reqNb = switchRequestToTeam1.length + switchRequestToTeam2.length;
      logger.info(`Balance changed: ${newBalance} ${reqNb} switch request${reqNb > 1 ? 's' : ''}.`);
    }),
    // Avoid concurrent execution of trySwitch, unlikely to happen, but just not useful.
    concatMap(trySwitch)
  ).subscribe();


  // todo: exhaustMap that. (don't want to start performing two different switch operation at the same time.
  //       finish this one, that will change current balance, before re-evaluating.
  async function trySwitch() {
    // Remove old requests from queues
    const now = new Date();
    switchRequestToTeam1 = switchRequestToTeam1.filter(req => now.getTime() - req.date.getTime() <= options.watchDuration * 1000);
    switchRequestToTeam2 = switchRequestToTeam2.filter(req => now.getTime() - req.date.getTime() <= options.watchDuration * 1000);

    // Remove request if the player already switched
    switchRequestToTeam1 = switchRequestToTeam1.filter(req => server.helpers.getPlayerByEOSID(req.eosID)?.teamID !== '1');
    switchRequestToTeam2 = switchRequestToTeam2.filter(req => server.helpers.getPlayerByEOSID(req.eosID)?.teamID !== '1');

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
    const unbalancedIds = unbalanceSwitch({
      reqTeam1: switchRequestToTeam1,
      reqTeam2: switchRequestToTeam2,
      team1Count: server.players.filter(player => player.teamID === '1').length,
      team2Count: server.players.filter(player => player.teamID === '2').length,
      maxAllowedPlayerCountDiff: options.maxAllowedPlayerCountDiff
    })

    // Remove ids we switched
    switchRequestToTeam1 = switchRequestToTeam1.filter(req => !unbalancedIds.includes(req.eosID));
    switchRequestToTeam2 = switchRequestToTeam2.filter(req => !unbalancedIds.includes(req.eosID));


    logger.info(`Switching ${ids.length + unbalancedIds.length} players.`);

    // Switch and inform selected players
    for (let eosID of [...ids, ...unbalancedIds]) {
      await server.rcon.forceTeamChange(eosID);
      await server.rcon.warn(eosID, options.messages.switch);

      // No timer limits on team changes
      const hasTeamChangePerm = server.helpers.getOnlineAdminsWithPermissions([AdminPerms.TeamChange]).some(admin => admin.player.eosID === eosID);
      if (!hasTeamChangePerm) {
        playerOnCooldown.set(eosID, new Date());
      }
    }
  }

  // et reste a gerer, les admins avec droit spécial. voir prio
  // cooldowna sur switch (filter)
  // watchDuration, pr eviter de se faire surprendre par le switch. (écrit en minutes)
  // on disconnect enlever du watch
  // le joueur change par la game ou a travers un admin, je dois pas reswitch <--- todo ! faire un from, to ? sur player ? et on player change, verif que il est tjrs ds la bonne team sinon untrack
  // admin perms: teamChange, on ignore time limit sur switch <-- todo

}

export default SwitchCommand;
