import { ObjectFromRegexStr } from '../log-parser/log-parser-helpers';

enum ServerConfigFile {
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

/**
 * Fetch up your squad config.
 * Currently incomplete.
 *
 * Note that RCON info likely wrong
 * as your server provider is likely to be using a proxy.
 */
export function useSquadConfig(fetcher: (file: ServerConfigFile) => Promise<string>) {
  // Setters are somewhat troublesome, hard to keep order of lines, comments, and more intact without quite
  // a bit of code.
  // Also, any setter will need to call ReloadServerConfig, and some stuff may take effect
  // only when new game starts...

  return {
    fetch: {
      admins: async () => {
        const str = await fetcher(ServerConfigFile.Admins);
        const perLine = str
          .split('\n')
          .map(line => line.trim())
          .filter(line => !line.match(/^\/\//)); // ignore comments

        return {
          admins: perLine
            .map(line => {
              const adminLine =
                '^Admin=(?<steamID>\\d+)+:(?<role>.\\w+)(:?\\ *\\/\\/\\ *)?(?<comment>.*)$';
              const matchAdmin = line.match(adminLine);

              if (matchAdmin) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                return matchAdmin.groups! as ObjectFromRegexStr<typeof adminLine>;
              } else {
                return null;
              }
            })
            .filter((obj): obj is NonNullable<typeof obj> => !!obj),
          groups: perLine
            .map(line => {
              // Praying group role is properly formatted in server config .-.
              const groupLine = '^Group=(?<role>\\w+)+:(?<rights>[\\w,]+)';
              const matchGroup = line.match(groupLine);

              if (matchGroup) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const obj = matchGroup.groups! as ObjectFromRegexStr<typeof groupLine>;
                return {
                  ...obj,
                  rights: obj.rights.split(','),
                };
              }
            })
            .filter((obj): obj is NonNullable<typeof obj> => !!obj),
        };
      },

      remoteAdminListHosts: async () => {
        return (await fetcher(ServerConfigFile.RemoteAdminListHosts)).split('\n');
      },
    },
  };
}
