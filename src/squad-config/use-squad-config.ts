import { parseAdminList } from './parse-admin-list';
import { Logger } from 'pino';

export enum ServerConfigFile {
  Admins = 'Admins',
  CustomOptions = 'CustomOptions',
  ExcludedLayers = 'ExcludedLayers',
  LayerRotation = 'LayerRotation',
  LayerVotingLowPlayers = 'LayerVotingLowPlayers',
  LevelRotation = 'LevelRotation',
  MOTD = 'MOTD',
  RemoteBanListHosts = 'RemoteBanListHosts',
  ServerMessages = 'ServerMessages',
  Bans = 'Bans',
  ExcludedFactions = 'ExcludedFactions',
  ExcludedLevels = 'ExcludedLevels',
  LayerVoting = 'LayerVoting',
  LayerVotingNight = 'LayerVotingNight',
  License = 'License',
  Rcon = 'Rcon',
  RemoteAdminListHosts = 'RemoteAdminListHosts',
  Server = 'Server',
  VoteConfig = 'VoteConfig',
}

export type SquadConfig = ReturnType<typeof useSquadConfig>;

/**
 * Fetch up your squad config.
 * Currently incomplete.
 *
 * Note that RCON info likely wrong
 * as your server provider is likely to be using a proxy.
 */
export function useSquadConfig(
  fetcher: (file: ServerConfigFile) => Promise<string>,
  logger: Logger
) {
  // Setters are somewhat troublesome, hard to keep order of lines, comments, and more intact without quite
  // a bit of code.
  // Also, any setter will need to call ReloadServerConfig, and some stuff may take effect
  // only when new game starts...

  return {
    fetch: {
      admins: async () => {
        logger.info(`Fetching ${ServerConfigFile.Admins}.cfg from server.`);
        return parseAdminList(await fetcher(ServerConfigFile.Admins));
      },

      remoteAdminListHosts: async () => {
        logger.info(`Fetching ${ServerConfigFile.RemoteAdminListHosts}.cfg from server.`);
        const urls = (await fetcher(ServerConfigFile.RemoteAdminListHosts))
          .split('\n')
          .map(a => a.trim())
          .filter(url => url.length > 0);

        logger.info(`Found ${urls.length} remote admin list hosts.`);

        const extraStr = await Promise.all(
          urls.map(url => {
            logger.info(`Fetching admin list from "${url}".`);
            return fetch(url)
              .then(res => res.text())
              .catch(e => {
                logger.error(
                  `Error fetching admin list from "${url}" (this admin list will be ignored): ${e?.message}`,
                  e
                );
                return '';
              });
          })
        );

        return extraStr.map(a => parseAdminList(a));
      },
    },
  };
}
