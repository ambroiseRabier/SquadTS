import { Rcon } from '../rcon/rcon';
import { extractIDs } from '../rcon/id-parser';
import { omit } from 'lodash';
import { ObjectFromRegexStr } from '../log-parser/log-parser-helpers';


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
      const regexStr = "^ID: (?<playerID>\\d+) \\| Online IDs:(?<ids>[^|]+)\\| Name: (?<name>.+) \\| Team ID: (?<teamID>\\d|N\\/A) \\| Squad ID: (?<squadID>\\d+|N\\/A) \\| Is Leader: (?<isLeader>True|False) \\| Role: (?<role>.+)$"
      const regex = new RegExp(regexStr);

      // (response ?? '') allow us to use type inference instead of making an empty array return before with a if, that would add the return type any[].
      return (response ?? '')
        .split('\n')
        .map((line) => (
          regex.exec(line)
        ))
        .filter((match): match is NonNullable<typeof match> => match !== null)
        .map((match) => {
          const groups = match.groups! as ObjectFromRegexStr<typeof regexStr>;
          const { isLeader, teamID, squadID, ids } = groups;
          return {
            ...omit(groups, ['isLeader', 'teamID', 'squadID', 'ids']),
            isLeader: isLeader === 'True',
            teamID: teamID !== 'N/A' ? teamID : null,
            squadID: squadID !== 'N/A' ? squadID : null,
            ...extractIDs(ids)
          };
        });
    },

    getSquads: async () => {
      const response = await execute('ListSquads');
      const regexStr = "ID: (?<squadID>\\d+) \\| Name: (?<squadName>.+) \\| Size: (?<size>\\d+) \\| Locked: (?<locked>True|False) \\| Creator Name: (?<creatorName>.+) \\| Creator Online IDs:(?<creator_ids>[^|]+)";
      const regex = new RegExp(regexStr);
      let side: {
        teamID: string;
        teamName: string;
      };


      // Using functional approach (.map) is preferred as typing can be inferred.
      // Each line is either a player or a Team. (and there is only two teams)
      return (response ?? '')
        .split('\n')
        // Assume map run in order.
        .map((line) => {
          const match = regex.exec(line);
          const matchSide = line.match(/Team ID: (?<teamID>\d) \((?<teamName>.+)\)/);

          if (matchSide) {
            // check for yourself, this is ok. Let's keep it simple here
            side = matchSide.groups! as any;
          }

          if (!match) {
            // same as continue in a for loop when combined with filter null bellow
            return null;
          }

          const groups = match.groups! as ObjectFromRegexStr<typeof regexStr>;

          return {
            ...omit(groups, ['creator_ids', 'creatorName', 'size', 'locked']),
            size: parseInt(groups.size),
            locked: groups.locked === 'True',
            // assume that map process in order.
            ...side,
            // creator ids is not to be confused with squad leader ids.
            creator: {
              ...extractIDs(groups.creator_ids),
              name: groups.creatorName,
            },
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
