import { Rcon } from '../rcon/rcon';
import { extractIDs } from '../rcon/id-parser';
import { omit } from 'lodash';


export function useRconSquadExecute(execute: Rcon['execute']) {

  return {
   getCurrentMap: async () => {
      const response: string = await execute('ShowCurrentMap');
      const match = response.match(/^Current level is (?<level>[^,]*), layer is (?<layer>[^,]*)/);
      return match!.groups! as { level: string; layer: string; };
    },

    getNextMap: async () => {
      const response = await execute('ShowNextMap');
      const match = response.match(/^Next level is ([^,]*), layer is ([^,]*)/);
      return {
        level: match ? (match[1] !== '' ? match[1] : null) : null,
        layer: match ? (match[2] !== 'To be voted' ? match[2] : null) : null
      };
    },

    getListPlayers: async () => {
      const response = await execute('ListPlayers');

      const players: {
        playerID: number;
        isLeader: boolean;
        teamID: number|null;
        squadID: number|null;
      }[] = [];

      if (!response || response.length < 1) {
        return players;
      }

      for (const line of response.split('\n')) {
        const match = line.match(
          /^ID: (?<playerID>\d+) \| Online IDs:(?<ids>[^|]+)\| Name: (?<name>.+) \| Team ID: (?<teamID>\d|N\/A) \| Squad ID: (?<squadID>\d+|N\/A) \| Is Leader: (?<isLeader>True|False) \| Role: (?<role>.+)$/
        );
        if (!match) continue;

        const {ids, isLeader, playerID, squadID, teamID} = match.groups!;

        players.push({
          playerID: parseInt(playerID),
          isLeader: isLeader === 'True',
          teamID: teamID !== 'N/A' ? parseInt(teamID) : null,
          squadID: squadID !== 'N/A' ? parseInt(squadID) : null,
          ...extractIDs(ids)
        });
      }

      return players;
    },

    getSquads: async () => {
      const responseSquad = await execute('ListSquads');

      if (!responseSquad || responseSquad.length < 1) {
        return [];
      }

      const squadRegex = /ID: (?<squadID>\d+) \| Name: (?<squadName>.+) \| Size: (?<size>\d+) \| Locked: (?<locked>True|False) \| Creator Name: (?<creatorName>.+) \| Creator Online IDs:(?<creator_ids>[^|]+)/;

      // Using functional approach (.map) is preferred as typing can be inferred.
      return responseSquad
        .split('\n')
        .map((line) => {
          const match = line.match(squadRegex);
          const matchSide = line.match(/Team ID: (?<teamID>\d) \((?<teamName>.+)\)/);

          if (!match) {
            // same as continue in a for loop when combined with filter null bellow
            return null;
          }

          return {
            ...omit(match.groups!, 'squadID'),
            squadID: parseInt(match.groups!.squadID),
            teamID: matchSide && parseInt(matchSide.groups!.teamID),
            teamName: matchSide && matchSide.groups!.teamName,
            // ...extractIDs(match.groups!.creator_ids, 'creator'),
            // todo breaking change (you may revert using git history if necessary), note: I kind of like to specify creator, as
            // it could easily be confused with squad leader (supposing there is actually a difference)
            ...extractIDs(match.groups!.creator_ids),
          };
        })
        // Remove null entries
        .filter((squad): squad is NonNullable<typeof squad> => squad !== null);
    },

    broadcast: async (message: string) => {
      await execute(`AdminBroadcast ${message}`);
    },

    setFogOfWar: async (mode: string) => {
      await execute(`AdminSetFogOfWar ${mode}`);
    },

    warn: async (anyID: string, message: string) => {
      await execute(`AdminWarn "${anyID}" ${message}`);
    },

    // 0 = Perm | 1m = 1 minute | 1d = 1 Day | 1M = 1 Month | etc...
    ban: async  (anyID: string, banLength: string, message: string) => {
      await execute(`AdminBan "${anyID}" ${banLength} ${message}`);
    },

    disbandSquad: async (teamID: string, squadID: string) => {
      await execute(`AdminDisbandSquad ${teamID} ${squadID}`);
    },

    kick: async (anyID: string, reason: string) => {
      await execute(`AdminKick "${anyID}" ${reason}`);
    },

    forceTeamChange: async (anyID: string) => {
      await execute(`AdminForceTeamChange "${anyID}"`);
    },
  };
}
