import { Rcon } from '../rcon/rcon';
import { extractIDs } from '../rcon/id-parser';
import { omit } from 'lodash-es';
import { ObjectFromRegexStr } from '../log-parser/log-parser-helpers';
import { Logger } from 'pino';
import { GameServerInfo, gameServerInfoKeys } from './server-info.type';
import { IncludesRCONCommand } from './rcon-commands';

// Note: you can do `ListCommands 1` with rcon to get documentation. (use script in scripts folder, not in-game so you can save output)
export function useRconSquadExecute(execute: Rcon['execute'], dryRun: boolean, logger: Logger) {
  let missingAndExtraCalledOnce = false;

  function dryRunExecute<T extends string>(command: IncludesRCONCommand<T>): Promise<string> {
    if (dryRun) {
      logger.warn(`Dry run: ${command}`);
      return Promise.resolve('This is a dry run, no command was executed.');
    } else {
      return execute(command);
    }
  }

  return {
    /**
     * Raw execute, use as last ressort.
     * Note that it will ignore dry run.
     * Recommendation is to skip execute when dry run is enabled and the command is game changing (like kick),
     * but still execute it in dry run when the command is non game changing (like ShowCurrentMap)
     */
    execute,
    getCurrentMap: async () => {
      const response: string = await execute('ShowCurrentMap');
      const match = response.match(/^Current level is (?<level>[^,]*), layer is (?<layer>[^,]*)/);

      if (!match) {
        throw new Error(`Failed to parse response from ShowCurrentMap: ${response}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return match.groups! as { level: string; layer: string };
    },

    getNextMap: async () => {
      const response = await execute('ShowNextMap');
      const match = response.match(/^Next level is ([^,]*), layer is ([^,]*)/);
      return {
        level: match ? (match[1] !== '' ? match[1] : null) : null,
        layer: match ? (match[2] !== 'To be voted' ? match[2] : null) : null,
      };
    },

    // Note: It appears that Webstorm is showing ids as return type, but autocompletion is not.
    /**
     * Execute ListPlayers
     */
    getListPlayers: async () => {
      const response = await execute('ListPlayers');
      const regexStr =
        '^ID: (?<id>\\d+) \\| Online IDs:(?<ids>[^|]+)\\| Name: (?<nameWithClanTag>.+) \\| Team ID: (?<teamID>\\d|N\\/A) \\| Squad ID: (?<squadID>\\d+|N\\/A) \\| Is Leader: (?<isLeader>True|False) \\| Role: (?<role>.+)$';
      const regex = new RegExp(regexStr);

      // (response ?? '') allow us to use type inference instead of making an empty array return before with a if, that would add the return type any[].
      return (response ?? '')
        .split('\n')
        .map(line => regex.exec(line))
        .filter((match): match is NonNullable<typeof match> => match !== null)
        .map(match => {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const groups = match.groups! as ObjectFromRegexStr<typeof regexStr>;
          const { isLeader, teamID, squadID, ids } = groups;
          return {
            ...omit(groups, ['isLeader', 'teamID', 'squadID', 'ids']),
            isLeader: isLeader === 'True',
            teamID: teamID as '1' | '2', // teamID !== 'N/A' ? teamID : null, // todo: actually possible ? admin cam perhaps ?
            squadID: squadID !== 'N/A' ? squadID : undefined,
            ...extractIDs(ids),
          };
        });
    },

    getSquads: async () => {
      const response = await execute('ListSquads');
      // Attention: creator name is without clan tag here...
      const regexStr =
        'ID: (?<squadID>\\d+) \\| Name: (?<name>.+) \\| Size: (?<size>\\d+) \\| Locked: (?<locked>True|False) \\| Creator Name: (?<creatorName>.+) \\| Creator Online IDs:(?<creator_ids>[^|]+)';
      const regex = new RegExp(regexStr);
      let side: {
        teamID: string;
        teamName: string;
      };

      // Using functional approach (.map) is preferred as typing can be inferred.
      // Each line is either a player or a Team. (and there is only two teams)
      return (
        (response ?? '')
          .split('\n')
          // Assume map run in order.
          .map(line => {
            const match = regex.exec(line);
            const matchSide = line.match(/Team ID: (?<teamID>\d) \((?<teamName>.+)\)/);

            if (matchSide) {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              side = matchSide.groups! as { teamID: string; teamName: string };
            }

            if (!match) {
              // same as continue in a for loop when combined with filter null bellow
              return null;
            }

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
          .filter((squad): squad is NonNullable<typeof squad> => squad !== null)
      );
    },

    // todo: renvoie quoi ? quoi que ce soit utile ?
    broadcast: async (message: string) => {
      await dryRunExecute(`AdminBroadcast ${message}`);
    },

    // Doesn't do anything ?
    setFogOfWar: async (mode: string) => {
      await dryRunExecute(`AdminSetFogOfWar ${mode}`);
    },

    /**
     *
     * @param anyID
     * @param message 97 characters is the maximum that can be displayed in game.
     */
    warn: async (anyID: string, message: string) => {
      await dryRunExecute(`AdminWarn "${anyID}" ${message}`);
    },

    // 0 = Perm | 1m = 1 minute | 1d = 1 Day | 1M = 1 Month | etc...
    ban: async (anyID: string, banLength: string, message: string) => {
      await dryRunExecute(`AdminBan "${anyID}" "${banLength}" ${message}`);
    },

    disbandSquad: async (teamID: string, squadID: string) => {
      await dryRunExecute(`AdminDisbandSquad ${teamID} ${squadID}`);
    },

    kick: async (anyID: string, reason: string) => {
      await dryRunExecute(`AdminKick "${anyID}" ${reason}`);
    },

    forceTeamChange: async (anyID: string) => {
      await dryRunExecute(`AdminForceTeamChange "${anyID}"`);
    },

    endMatch: async () => {
      await dryRunExecute('AdminEndMatch');
    },

    // todo: rename squadID squadIndex everywhere :)
    // todo: rename teamID TeamNumber everywhere (like the game does)
    // Rename is not possible, but you can reset it to default name "Squad 1", "Squad 2", ...
    resetSquadName: async (teamID: string, squadID: string) => {
      await dryRunExecute(`AdminRenameSquad ${teamID} ${squadID}`);
    },

    demoteCommander: async (anyID: string) => {
      await dryRunExecute(`AdminDemoteCommander ${anyID}`)
    },

    // Don't remember exactly which one, but some change are taken in account only
    // at layer change, some only until restart, and this command is a recent addition
    // from Squad to allow updating the config without having to restart the server.
    reloadServerConfig: async () => {
      await dryRunExecute('AdminReloadServerConfig');
    },

    showServerInfo: async () => {
      const infoStr = await execute('ShowServerInfo');
      const info = JSON.parse(infoStr) as GameServerInfo;

      // We check for change in returned data, and inform user/dev that something changed.
      const infoKeys = Object.keys(info);
      const missingKeys = gameServerInfoKeys.filter(key => !infoKeys.includes(key));
      // I'm trying to find potential string that are not part of gameServerInfoKeys, obviously type will mismatch.
      // But still, we are using string all the way.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const extraKeys = infoKeys.filter(key => !gameServerInfoKeys.includes(key as any));

      // Mostly aimed at SquadTS developers
      if (!missingAndExtraCalledOnce) {
        missingAndExtraCalledOnce = true;
        if (missingKeys.length > 0) {
          // Right now we get: LicenseId_s,LicenseSig1_s,LicenseSig2_s,LicenseSig3_s,TagLanguage_s,TagGameMode-0_s,TagGameMode-1_s,TagGameMode-2_s,TagGameMode_s,TagPlaystyle_s,TagMapRotation_s,TagExperience_s,TagRules_s
          // For an unlicensed server with almost no config on it.
          logger.warn(
            `Missing keys found in server info (will only log once per start): ${missingKeys.join(',')}`
          );
        }
        if (extraKeys.length > 0) {
          logger.warn(
            `Extra keys found in server info (will only log once per start): ${extraKeys.join(',')}`
          );
        }
      }

      function getMatchStartTimeByPlaytime(playtime: number) {
        return new Date(Date.now() - playtime * 1000);
      }

      return {
        raw: info,
        serverName: info.ServerName_s,

        maxPlayers: info.MaxPlayers,
        publicQueueLimit: parseInt(info.PublicQueueLimit_I),
        reserveSlots: parseInt(info.PlayerReserveCount_I),

        playerCount: parseInt(info.PlayerCount_I),
        a2sPlayerCount: parseInt(info.PlayerCount_I),
        publicQueue: parseInt(info.PublicQueue_I),
        reserveQueue: parseInt(info.ReservedQueue_I),

        currentLayer: info.MapName_s,
        nextLayer: info.NextLayer_s,
        isSeed: info.MapName_s.search(/seed/i) !== -1,

        teamOne: info.TeamOne_s?.replace(new RegExp(info.MapName_s, 'i'), '') || '',
        teamTwo: info.TeamTwo_s?.replace(new RegExp(info.MapName_s, 'i'), '') || '',

        matchTimeout: info.MatchTimeout_d,
        matchStartTime: getMatchStartTimeByPlaytime(parseInt(info.PLAYTIME_I)),
        gameVersion: info.GameVersion_s,

        publicSlots: info.MaxPlayers - parseInt(info.PlayerReserveCount_I),
        nextLayerToBeVoted: info.NextLayer_s === 'To be voted',
      };
    },
  };
}
