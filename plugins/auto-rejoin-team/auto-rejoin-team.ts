import { Logger } from 'pino';
import { AutoRejoinOptions } from './auto-rejoin-team.config';
import { SquadServer } from '../../src/squad-server';
import { SquadTSPlugin } from '../../src/plugin-loader/plugin.interface';

const autoRejoin: SquadTSPlugin<AutoRejoinOptions> = async (
  server: SquadServer,
  connectors,
  logger: Logger,
  options
) => {
  const trackedPlayers = new Map<string, { disconnectDate: number; teamID: '1' | '2' }>();

  server.events.playerDisconnected.subscribe(async data => {
    // Do not use data.date as server date, it may have minutes in difference (yes I saw that!), if not timezone diff.
    // data.date is more accurate, but isn't worth the hassle.
    trackedPlayers.set(data.player.eosID, {
      disconnectDate: Date.now(),
      teamID: data.player.teamID,
    });
  });

  function filterOldDisconnectOut() {
    // min to ms
    const disconnectionThreshold = options.trackDisconnectedFor * 1000 * 60;

    trackedPlayers.forEach((data, eosID) => {
      if (Date.now() - data.disconnectDate > disconnectionThreshold) {
        trackedPlayers.delete(eosID);
      }
    });
  }

  // Preferred over events.playerConnected, as it gives us teamID
  server.addPlayer$.subscribe(async newPlayer => {
    filterOldDisconnectOut();

    const trackedPlayer = trackedPlayers.get(newPlayer.eosID);
    if (trackedPlayer) {
      const joinedWrongTeam = trackedPlayer.teamID !== newPlayer.teamID;
      if (joinedWrongTeam) {
        await server.rcon.forceTeamChange(newPlayer.teamID);
        await server.rcon.warn(newPlayer.eosID, options.message);
      } // else joined his previous team, do nothing
    } // if not tracked, do nothing
  });
};

// noinspection JSUnusedGlobalSymbols
export default autoRejoin;
