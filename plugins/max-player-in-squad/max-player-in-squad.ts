import { MaxPlayerInSquadOptions } from './max-player-in-squad.config';
import { exhaustMap, filter, interval, map } from 'rxjs';
import { formatDuration, intervalToDuration } from 'date-fns';
import { SquadTSPlugin } from '../../src/plugin-loader/plugin.interface';
import { Player, Squad } from '../../src/cached-game-status/use-cached-game-status';
import { PlayerSL } from '../../src/cached-game-status/use-helpers';

interface TransgressorDetails {
  nameWithClanTag: string;
  squadIndex: string;
  teamID: string;
  squadName: string;
  firstWarn: number;
  maxPlayerInSquad: number;
  warnCount: number;
  containWord: string;
}

const maxPlayerInSquad: SquadTSPlugin<MaxPlayerInSquadOptions> = async (
  server,
  connectors,
  logger,
  options
) => {
  const transgressors = new Map<string, TransgressorDetails>();

  const allSL = server.players.filter(p => server.helpers.isSL(p));

  for (const sl of allSL) {
    await checkSquadPlayerNumber(sl.squad);
  }

  interval(options.warnRate * 1000)
    .pipe(exhaustMap(updateTrackingList))
    .subscribe();

  server.events.playersSquadChange
    .pipe(
      // Do nothing when in seed
      filter(() => options.enabledInSeed || !server.info.isSeed),
      // Only for players joining a squad, not when they leave.
      map(players =>
        players.filter(
          (player): player is Player & Required<Pick<Player, 'squad' | 'squadIndex'>> =>
            !!player.squad
        )
      )
    )
    .subscribe(async playerWithSquad => {
      for (const player of playerWithSquad) {
        await checkSquadPlayerNumber(player.squad, player);
      }
    });

  async function checkSquadPlayerNumber(squad: Squad, enteringPlayer?: Player) {
    // Selon la squad name, récupérer le bon maximum
    // On fait une recherche case insensitive
    const configForThisSquad = options.squadTypes.find(
      squadType => squad.name.search(new RegExp(squadType.containWord, 'i')) !== -1
    );

    // No limit found, do nothing.
    if (!configForThisSquad) {
      return;
    }

    const maxPlayerInSquad = configForThisSquad.maxPlayers;

    // Récup l'ensemble des joueurs dans la squad ID.
    const playersInSquad = server.players.filter(
      p => p.squadIndex === squad.squadIndex && p.teamID === squad.teamID
    );
    // There is always a lead in a squad
    const playerSquadLead = playersInSquad.find(p => p.isLeader) as Player;

    // Too many players
    if (playersInSquad.length > maxPlayerInSquad) {
      // Track sl and warn
      if (!transgressors.has(playerSquadLead.eosID)) {
        logger.info(
          `Tracking SL: ${playerSquadLead.nameWithClanTag} ${playersInSquad.length}/${maxPlayerInSquad}.
            Le max pour ${configForThisSquad.containWord} est ${maxPlayerInSquad}`
        );
        const transgressorDetails = {
          nameWithClanTag: playerSquadLead.nameWithClanTag ?? 'Unknown', // Should never be undef, since playerSquadChange event is based on RCON.
          squadIndex: squad.squadIndex,
          teamID: squad.teamID,
          squadName: squad.name,
          firstWarn: Date.now(),
          maxPlayerInSquad: maxPlayerInSquad,
          warnCount: 2,
          containWord: configForThisSquad.containWord,
        };
        transgressors.set(playerSquadLead.eosID, transgressorDetails);

        // Warn SL, (first warn)
        await warn(
          playerSquadLead,
          { ...transgressorDetails, warnCount: 1 },
          playersInSquad.length
        );
      }

      // Since we check squads both at startup and when a player change squad, in the first
      // case, there is not "entering" player.
      if (enteringPlayer) {
        // Warn entering player.
        // We just checked above if that key exists, and have set it.

        await warn(
          enteringPlayer,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          transgressors.get(playerSquadLead.eosID)!,
          playersInSquad.length
        );
      }
    }
  }

  async function updateTrackingList() {
    for (const [squadLead_eosID, transgressorDetails] of transgressors) {
      const sl = server.helpers.getPlayerByEOSID(squadLead_eosID);
      logger.info(
        `Checking tracked SL: ${transgressorDetails.nameWithClanTag} (eosID: ${squadLead_eosID})} | squadName: ${transgressorDetails.squadName} | warnCount: ${transgressorDetails.warnCount}`
      );

      // Not connected or not SL anymore
      if (!sl || !server.helpers.isSL(sl)) {
        transgressors.delete(squadLead_eosID);
        continue;
      }

      // Has changed squad or team
      if (
        sl.squadIndex !== transgressorDetails.squadIndex ||
        sl.teamID !== transgressorDetails.teamID
      ) {
        transgressors.delete(squadLead_eosID);
        continue;
      }

      // Note: since we checked that player is SL, he cannot have a null/undef squadIndex/squad
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const squad = server.helpers.getSquad(sl.teamID, sl.squadIndex)!;

      // Squad name changed (but IDs are the same)
      if (transgressorDetails.squadName !== squad.name) {
        transgressors.delete(squadLead_eosID);
        continue;
      }

      // If warn rate is 60sec, it give +/- 30sec to second warn.
      // This is to avoid unfair double warn in short time.
      const timeSinceFirstWarn = (Date.now() - transgressorDetails.firstWarn) / 1000;
      if (timeSinceFirstWarn < options.warnRate / 2) {
        continue;
      }

      const playersInSquad = server.helpers.getPlayersInSquad(
        transgressorDetails.teamID,
        transgressorDetails.squadIndex
      );
      const tooManyPlayers = playersInSquad.length > transgressorDetails.maxPlayerInSquad;

      if (tooManyPlayers) {
        if (transgressorDetails.warnCount > options.maxWarnBeforeDisband) {
          await punish(
            sl,
            transgressorDetails,
            playersInSquad.length,
            playersInSquad.filter(p => p.eosID != sl.eosID)
          );
          transgressors.delete(squadLead_eosID);
        } else {
          await warn(sl, transgressorDetails, playersInSquad.length);
          // Update the lastWarn timestamp
          transgressors.set(squadLead_eosID, {
            ...transgressorDetails,
            warnCount: transgressorDetails.warnCount + 1,
          });
        }
      } else {
        transgressors.delete(squadLead_eosID);
      }
    }
  }

  /**
   * Example "Warning (%warn_count%) - Squad size of %squadType% is too big, max is %max%."
   */
  async function warn(
    player: Player,
    transgressorDetails: TransgressorDetails,
    playersInSquadLength: number
  ) {
    const message = options.messages.warn
      .replaceAll('%squadType%', transgressorDetails.squadName)
      .replaceAll('%max%', transgressorDetails.maxPlayerInSquad.toString())
      .replaceAll('%warn_count%', `${transgressorDetails.warnCount}/${options.maxWarnBeforeDisband}`);

    // Resend the warning to the squad leader
    await server.rcon.warn(player.eosID, message);
    logger.info(
      `${transgressorDetails.warnCount}/${options.maxWarnBeforeDisband} Warning player (SL: ${player.isLeader ? 'yes' : 'no'}): ${player.nameWithClanTag} - ${playersInSquadLength}/${transgressorDetails.maxPlayerInSquad} players.`
    );
  }

  // Disband squad as punishment
  async function punish(
    squadLeader: PlayerSL,
    transgressorDetails: TransgressorDetails,
    playersInSquadLength: number,
    otherPlayersInSquad: Player[]
  ) {
    const disbandMessage = options.messages.disband.replace(
      '%squadName%',
      transgressorDetails.squadName
    );

    // Notify squad leader about the disbanding
    await server.rcon.warn(squadLeader.eosID, disbandMessage);

    // Notify members about the disbanding
    await Promise.all(
      otherPlayersInSquad.map(player => server.rcon.warn(player.eosID, disbandMessage))
    );

    // Disband the squad
    await server.rcon.disbandSquad(squadLeader.teamID, squadLeader.squadIndex);
    const disbandBroadcastMessage = options.messages.disbandBroadcast
      .replaceAll('%teamNumber%', transgressorDetails.teamID)
      .replaceAll('%squadIndex%', transgressorDetails.squadIndex)
      .replaceAll('%squadName%', transgressorDetails.squadName)
      .replaceAll('%maxPlayerInSquad%', transgressorDetails.maxPlayerInSquad.toString())
      .replaceAll('%squadType%', transgressorDetails.containWord);
    await server.rcon.broadcast(disbandBroadcastMessage);

    const warnStr = `${transgressorDetails.warnCount}/${options.maxWarnBeforeDisband} warns`;
    const squadSizeStr = `${playersInSquadLength}/${transgressorDetails.maxPlayerInSquad} players`;
    // If less than a second, empty string is returned, that's not a bug, but appear so in tests.
    const durationStr = `No action since: ${formatDuration(intervalToDuration({ start: transgressorDetails.firstWarn, end: Date.now() })) || 'Instant (ms interval)!'}`;
    logger.info(
      `Disbanding SL squad: ${squadLeader.nameWithClanTag} - ${squadSizeStr} - ${warnStr} - ${durationStr}`
    );
  }
};

// noinspection JSUnusedGlobalSymbols
export default maxPlayerInSquad;
