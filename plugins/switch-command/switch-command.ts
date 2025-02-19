import { SwitchCommandConfig } from './switch-command.config';
import { concatMap, debounceTime, filter, map, tap } from 'rxjs';
import { balanceIncreaseSwitch, SwitchRequest, unbalanceSwitch } from './src/switch-helpers';
import { trackBalanceChange } from './src/track-balance-change';
import { sortRequests } from './src/sort-requests';
import { Player, AdminPerms, SquadTSPlugin } from '../../src/exports';

const switchCommand: SquadTSPlugin<SwitchCommandConfig> = async (
  server,
  connectors,
  logger,
  options
) => {
  // We want to check for switch possibilities only when:
  // - The balance change in the game (player connected, disconnected, changed team)
  // - Another player call !switch

  let switchRequestToTeam1: SwitchRequest[] = [];
  let switchRequestToTeam2: SwitchRequest[] = [];
  const playerOnCooldown = new Map<string, Date>();

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
          date: date,
        });
      }
    } else if (player.teamID === '2') {
      const req = switchRequestToTeam1.find(req => req.eosID === player.eosID);
      if (req) {
        req.date = date;
      } else {
        switchRequestToTeam1.push({
          eosID: player.eosID,
          date: date,
        });
      }
    }
  }

  server.chatEvents.command
    .pipe(filter(data => data.command === options.command))
    .subscribe(async data => {
      logger.info(
        `Player ${data.player.nameWithClanTag} (${data.player.eosID}) requested to switch`
      );

      // Note: these peoples can also freely switch using game UI.
      const ignoreRules = server.helpers.playerHasPermissions(data.player.eosID, [
        AdminPerms.Balance,
      ]);

      if (ignoreRules) {
        logger.info(`Switching admin ${data.player.nameWithClanTag} (${data.player.eosID})`);
        await server.rcon.forceTeamChange(data.player.eosID);
        await server.rcon.warn(data.player.eosID, options.messages.switchAdmin);
        // Do not track him, he is a free man.
        return;
      }

      const team1Count = server.players.filter(player => player.teamID === '1').length;
      const team2Count = server.players.filter(player => player.teamID === '2').length;
      const diff = Math.abs(team1Count - team2Count);
      const ignoreCooldown = diff >= options.ignoreCooldownStartingUnbalance;

      if (ignoreCooldown || !hasCooldown(data.player.eosID)) {
        logger.debug(
          `Player ${data.player.nameWithClanTag} (${data.player.eosID}) is not on cooldown`
        );
        trackPlayer(data.player, data.date); // todo, maybe data.time is nice, less confusing than e and a...
        await trySwitch(data.player.eosID);
      } else {
        logger.debug(`Player ${data.player.nameWithClanTag} (${data.player.eosID}) is on cooldown`);
        // We checked that player has cooldown with !hasCooldown(data.player.eosID) above.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const timeDiff = new Date().getTime() - playerOnCooldown.get(data.player.eosID)!.getTime();
        await server.rcon.warn(
          data.player.eosID,
          options.messages.onCooldown.replace(
            '%cooldown%',
            Math.ceil((options.cooldown - timeDiff / 1000) / 60) + 'min'
          )
        );
      }
    });

  server.events.playerDisconnected.subscribe(async data => {
    switchRequestToTeam1 = switchRequestToTeam1.filter(req => req.eosID !== data.player.eosID);
    switchRequestToTeam2 = switchRequestToTeam2.filter(req => req.eosID !== data.player.eosID);
    // Do not delete from playerOnCooldown, we don't want rejoining player to cheat cooldown.
  });

  trackBalanceChange(server.players$)
    .pipe(
      filter(() => switchRequestToTeam1.length > 0 || switchRequestToTeam2.length > 0),
      // Small debounce time to avoid spam at end/start of the game
      debounceTime(1000),
      tap(newBalance => {
        const reqNb = switchRequestToTeam1.length + switchRequestToTeam2.length;
        logger.info(
          `Balance changed: ${newBalance}. ${reqNb} switch request${reqNb > 1 ? 's' : ''}.`
        );
      }),
      // Do not send eosID to trySwitch.
      map(() => undefined),
      // Avoid concurrent execution of trySwitch, unlikely to happen, but just not useful.
      concatMap(trySwitch)
    )
    .subscribe();

  // todo: exhaustMap that. (don't want to start performing two different switch operation at the same time.
  //       finish this one, that will change current balance, before re-evaluating.
  async function trySwitch(eosIDToAskForPatience?: string) {
    // Remove old requests from queues
    const now = new Date();
    switchRequestToTeam1 = switchRequestToTeam1.filter(
      req => now.getTime() - req.date.getTime() <= options.watchDuration * 1000
    );
    switchRequestToTeam2 = switchRequestToTeam2.filter(
      req => now.getTime() - req.date.getTime() <= options.watchDuration * 1000
    );

    // Remove request if the player already switched
    switchRequestToTeam1 = switchRequestToTeam1.filter(
      // We remove player from switchRequestToTeam1 when player disconnect, making it impossible to
      // not get player by eos id.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      req => server.helpers.getPlayerByEOSID(req.eosID)!.teamID === '2'
    );
    switchRequestToTeam2 = switchRequestToTeam2.filter(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      req => server.helpers.getPlayerByEOSID(req.eosID)!.teamID === '1'
    );

    // Sort by earlier to later date. (asc)
    switchRequestToTeam1 = sortRequests(switchRequestToTeam1, server.helpers.playerHasPermissions);
    switchRequestToTeam2 = sortRequests(switchRequestToTeam2, server.helpers.playerHasPermissions);

    // Switch players that will not change balance
    // ex: we got 4 and 7 demands, we can switch 4 players without worrying about balance changes.
    const ids = balanceIncreaseSwitch(switchRequestToTeam1, switchRequestToTeam2);

    // Do not switch immediately before we calculated everything we need.

    // Remove ids we switched
    switchRequestToTeam1 = switchRequestToTeam1.filter(req => !ids.includes(req.eosID));
    switchRequestToTeam2 = switchRequestToTeam2.filter(req => !ids.includes(req.eosID));

    const team1Count = server.players.filter(player => player.teamID === '1').length;
    const team2Count = server.players.filter(player => player.teamID === '2').length;

    // Now, if we had 4 and 7 requests, we are left with 0, 3 requests
    const unbalancedIds = unbalanceSwitch({
      reqTeam1: switchRequestToTeam1,
      reqTeam2: switchRequestToTeam2,
      team1Count,
      team2Count,
      maxAllowedPlayerCountDiff: options.maxAllowedPlayerCountDiff,
    });

    // Remove ids we switched
    switchRequestToTeam1 = switchRequestToTeam1.filter(req => !unbalancedIds.includes(req.eosID));
    switchRequestToTeam2 = switchRequestToTeam2.filter(req => !unbalancedIds.includes(req.eosID));

    const stillInQueue =
      eosIDToAskForPatience &&
      [...switchRequestToTeam1, ...switchRequestToTeam2].some(
        req => req.eosID === eosIDToAskForPatience
      );

    // Player that asked for !switch is not immediately switched, ask for patience and also tell him his request is received.
    if (stillInQueue) {
      await server.rcon.warn(eosIDToAskForPatience, options.messages.balanceWait);
    }

    const toBeSwitched = [...ids, ...unbalancedIds];
    const before = `${team1Count}v${team2Count}`;
    const after = `${team1Count - toBeSwitched.length}v${team2Count + toBeSwitched.length}`;

    if (toBeSwitched.length === 0) {
      logger.debug('No player to switch');
    } else {
      logger.info(
        `Switching ${ids.length + unbalancedIds.length} players. Balance: ${before} => ${after}`
      );
    }

    // Switch and inform selected players
    for (const eosID of toBeSwitched) {
      await server.rcon.forceTeamChange(eosID);
      await server.rcon.warn(eosID, options.messages.switch);

      // No timer limits on team changes
      const hasTeamChangePerm = server.helpers.playerHasPermissions(eosID, [AdminPerms.TeamChange]);
      if (!hasTeamChangePerm) {
        playerOnCooldown.set(eosID, new Date());
      }
    }
  }
};

export default switchCommand;
