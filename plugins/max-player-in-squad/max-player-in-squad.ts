import { MaxPlayerInSquadOptions } from './max-player-in-squad.config';
import { Player, PlayerSL, SquadTSPlugin } from '../../src/exports';
import { exhaustMap, filter, interval, map } from 'rxjs';

interface TransgressorDetails {
  squadID: string;
  teamID: string;
  squadName: string;
  firstWarn: number;
  maxPlayerInSquad: number;
  warnCount: number;
  containWord: string;
}

const SQUAD_TYPE_KEY = '%squadType%';
const MAX_KEY = '%max%';
const WARN_COUNT_KEY = '%warn_count%';

const maxPlayerInSquad: SquadTSPlugin<MaxPlayerInSquadOptions> = async (
  server,
  connectors,
  logger,
  options
) => {
  const transgressors = new Map<string, TransgressorDetails>();

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
          (player): player is Player & Required<Pick<Player, 'squad' | 'squadID'>> => !!player.squad
        )
      )
    )
    .subscribe(async playerWithSquad => {
      for (const player of playerWithSquad) {
        // Selon la squad name, récupérer le bon maximum
        // On fait une recherche case insensitive
        const configForThisSquad = options.squadTypes.find(
          squad => player.squad.name.search(new RegExp(squad.containWord, 'i')) !== -1
        );

        // No limit found, do nothing.
        if (!configForThisSquad) {
          continue;
        }

        const maxPlayerInSquad = configForThisSquad.maxPlayers;

        // Récup l'ensemble des joueurs dans la squad ID.
        const playersInSquad = server.players.filter(
          p => p.squadID === player.squadID && p.teamID === player.teamID
        );
        // There is always a lead in a squad
        const playerSquadLead = playersInSquad.find(p => p.isLeader) as Player;

        // Trop de joueur
        if (playersInSquad.length > maxPlayerInSquad) {
          // Alors first warn
          const message = options.message
            .replace('%squadType%', player.squad.name)
            .replace('%max%', maxPlayerInSquad.toString())
            .replace('%warn_count%', `1/${options.maxWarnBeforeDisband}`);

          // si premier warn, on enregistre l'id du SL et on le warn
          if (!transgressors.has(playerSquadLead.eosID)) {
            logger.info(
              `Tracking SL: ${playerSquadLead.name} ${playersInSquad.length}/${maxPlayerInSquad}.
            Le max pour ${configForThisSquad.containWord} est ${maxPlayerInSquad}`
            );
            transgressors.set(playerSquadLead.eosID, {
              // We are iterating playerWithSquad...
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              squadID: player.squadID!, // same as playerSquadLead.squadID
              teamID: player.teamID,
              squadName: player.squad.name,
              firstWarn: Date.now(),
              maxPlayerInSquad: maxPlayerInSquad,
              warnCount: 2,
              containWord: configForThisSquad.containWord,
            });

            // Warn SL.
            await server.rcon.warn(playerSquadLead.eosID, message);
          }

          // Warn joueur entrant dans tout les cas
          await server.rcon.warn(player.eosID, message);
        }
      }
    });

  async function updateTrackingList() {
    for (const [squadLead_eosID, transgressorDetails] of transgressors) {
      const sl = server.helpers.getPlayerByEOSID(squadLead_eosID);
      logger.info(`Checking tracked SL: ${squadLead_eosID} ${JSON.stringify(transgressorDetails)}`);

      // Not connected or not SL anymore
      if (!sl || !server.helpers.isSL(sl)) {
        transgressors.delete(squadLead_eosID);
        continue;
      }

      // Has changed squad or team
      if (sl.squadID !== transgressorDetails.squadID || sl.teamID !== transgressorDetails.teamID) {
        transgressors.delete(squadLead_eosID);
        continue;
      }

      // Note: since we checked that player is SL, he cannot have a null/undef squadID/squad
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const squad = server.helpers.getSquad(sl.teamID, sl.squadID)!;

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
        transgressorDetails.squadID
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

  async function warn(
    squadLeader: PlayerSL,
    transgressorDetails: TransgressorDetails,
    playersInSquadLength: number
  ) {
    const message = options.message
      .replace(SQUAD_TYPE_KEY, transgressorDetails.squadName)
      .replace(MAX_KEY, transgressorDetails.maxPlayerInSquad.toString())
      .replace(WARN_COUNT_KEY, `${transgressorDetails.warnCount}/${options.maxWarnBeforeDisband}`);

    // Resend the warning to the squad leader
    await server.rcon.warn(squadLeader.eosID, message);
    logger.info(
      `${transgressorDetails.warnCount}/${options.maxWarnBeforeDisband} Warning SL: ${squadLeader.name} - ${playersInSquadLength}/${transgressorDetails.maxPlayerInSquad} joueurs.`
    );
  }

  // Disband squad as punishment
  async function punish(
    squadLeader: PlayerSL,
    transgressorDetails: TransgressorDetails,
    playersInSquadLength: number,
    otherPlayersInSquad: Player[]
  ) {
    const disbandMessage = `The squad ${transgressorDetails.squadName} has exceeded the allowed warnings and will now be disbanded.`;

    // Notify squad leader about the disbanding
    await server.rcon.warn(squadLeader.eosID, disbandMessage);

    // Notify members about the disbanding
    await Promise.all(
      otherPlayersInSquad.map(player => server.rcon.warn(player.eosID, disbandMessage))
    );

    // Disband the squad
    await server.rcon.disbandSquad(squadLeader.teamID, squadLeader.squadID);
    await server.rcon.broadcast(
      `Team ${transgressorDetails.teamID} Squad ${transgressorDetails.squadID} "${transgressorDetails.squadName}" has been disbanded because it exceed maximum player count (${transgressorDetails.maxPlayerInSquad}) for squad type (${transgressorDetails.containWord}).`
    );

    logger.info(
      `Disbanding SL squad: ${squadLeader.name} - ${playersInSquadLength}/${transgressorDetails.maxPlayerInSquad} joueurs - ${transgressorDetails.warnCount}/${options.maxWarnBeforeDisband} warns`
    );
  }
};

// noinspection JSUnusedGlobalSymbols
export default maxPlayerInSquad;
