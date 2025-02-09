import { SquadServer } from '../../src/squad-server';
import { SquadTSPlugin } from '../../src/plugin-loader/plugin.interface';
import { Logger } from 'pino';
import { AutoRejoinOptions } from './auto-rejoin-team.config';


const autoRejoin: SquadTSPlugin<AutoRejoinOptions> = async (server: SquadServer, connectors, logger: Logger, options) => {
  const trackedPlayers = new Map<string, { disconnectDate: Date; teamID: '1' | '2' }>();
  
  server.events.playerDisconnected.subscribe(async (data) => {
    trackedPlayers.set(
      data.player.eosID,
      {
        disconnectDate: data.date,
        teamID: data.player.teamID,
      }
    );
  });

  function filterOldDisconnectOut() {
    // min to ms
    const disconnectionThreshold = options.trackDisconnectedFor * 1000 * 60;
    const now = new Date();

    trackedPlayers.forEach((data, eosID) => {
      if (now.getTime() - data.disconnectDate.getTime() > disconnectionThreshold) {
        trackedPlayers.delete(eosID);
      }
    });
  }

  // Preferred over events.playerConnected, as it gives us teamID
  server.addPlayer$.subscribe(async (newPlayer) => {
    filterOldDisconnectOut();

    const trackedPlayer = trackedPlayers.get(newPlayer.eosID);
    if (trackedPlayer) {
      const joinedWrongTeam = trackedPlayer.teamID !== newPlayer.teamID;
      if (joinedWrongTeam) {
        await server.rcon.forceTeamChange(newPlayer.teamID);
        await server.rcon.warn(newPlayer.teamID, options.message);
      } // else joined his previous team, do nothing
    } // if not tracked, do nothing
  })
};

// noinspection JSUnusedGlobalSymbols
export default autoRejoin;

