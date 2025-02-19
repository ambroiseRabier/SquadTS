import { Logger } from 'pino';
import { RconSquad } from './rcon-squad/use-rcon-squad';
import { LogParser } from './log-parser/use-log-parser';
import { filter } from 'rxjs';
import { CachedGameStatus, Player } from './cached-game-status/use-cached-game-status';
import { omit } from 'lodash-es';
import { AdminList } from './admin-list/use-admin-list';
import { AdminPerms } from './admin-list/permissions';
import { RefinedLogEvents } from './cached-game-status/use-refined-log-events';
import { useHelpers } from './cached-game-status/use-helpers';
import { RefinedChatEvents } from './cached-game-status/use-refined-chat-events';
import { GithubWikiWeapon } from './github-info/github-weapons.type';
import { GithubWiki } from './github-info/github-layer.type';

export type SquadServer = ReturnType<typeof useSquadServer>;

interface Props {
  logger: Logger;
  rconSquad: RconSquad;
  logParser: LogParser;
  cachedGameStatus: CachedGameStatus;
  adminList: AdminList;
  refinedLogEvents: RefinedLogEvents;
  refinedChatEvents: RefinedChatEvents;
  githubInfo: {
    layerInfo: GithubWiki.Layer;
    weaponInfo: Record<string, GithubWikiWeapon.WeaponInfo>;
  }
}
// test eslint, prettier
var v = "double quote oh no with var and not const oh no";

export function useSquadServer({
  logger,
  rconSquad,
  logParser,
  cachedGameStatus,
  adminList,
  refinedLogEvents,
  refinedChatEvents,
  githubInfo,
}: Props) {
  const { admins, getAdminsWithPermissions } = adminList;
  const helpers = useHelpers({
    squads: () => cachedGameStatus.squads$.getValue(),
    players: () => cachedGameStatus.players$.getValue(),
    serverInfo: () => cachedGameStatus.serverInfo$.getValue(),
  });

  /**
   * Exclude suicide
   */
  const teamKill = refinedLogEvents.playerWounded.pipe(
    filter(
      ({ attacker, victim }) => attacker.teamID === victim.teamID && attacker.eosID !== victim.eosID
    )
  );

  /**
   * Suicide.
   * Doesn't trigger when dying in a vehicle (e.g., heli crash or drowning in water).
   */
  const suicide = refinedLogEvents.playerWounded.pipe(
    filter(({ attacker, victim }) => attacker.eosID === victim.eosID)
  );

  // todo tmp, finish implementing when we need it...
  //const githubLayer: GithubWiki.Layer = {} as any;

  const getOnlineAdminsWithPermissions = (permissions: AdminPerms[]) => {
    const steamIDAndPerms = getAdminsWithPermissions(permissions);
    return steamIDAndPerms
      .map(([steamId64, perms]) => ({
        player: helpers.getPlayerBySteamID(steamId64),
        perms,
      }))
      .filter((obj): obj is { player: Player; perms: AdminPerms[] } => !!obj.player);
  };

  return {
    githubInfo,
    //githubLayer,
    info: cachedGameStatus.serverInfo$.getValue(),
    get players() {
      return cachedGameStatus.players$.getValue();
    },
    players$: cachedGameStatus.players$,
    /**
     * Far more valuable than `playerConnected`, as it provides significantly more detailed information.
     */
    addPlayer$: cachedGameStatus.addPlayer$,
    squad$: cachedGameStatus.squads$,
    get squads() {
      return cachedGameStatus.squads$.getValue();
    },
    admins,
    events: {
      ...refinedLogEvents,
      teamKill,
      suicide,
      // Prevent accidentally using next by passing Subject as Observable.
      playersSquadChange: cachedGameStatus.playersSquadChange$.asObservable(),
    },
    chatEvents: refinedChatEvents,
    adminsInAdminCam: rconSquad.adminsInAdminCam,
    helpers: {
      ...helpers,
      getOnlineAdminsWithPermissions,
      playerHasPermissions: (eosID: string, permissions: AdminPerms[]) => {
        return getOnlineAdminsWithPermissions(permissions).some(
          admin => admin.player.eosID === eosID
        );
      },
    },
    // Omit chatEvent as cachedGameStatus enrich them with player, and this one should be used by plugins.
    rcon: omit(rconSquad, ['chatEvents', 'adminsInAdminCam']),
    watch: async () => {
      // Helper so I know which server is using SquadTS, I may ask some questions about how it is going ;)
      logParser.events.playerConnected.subscribe(player => {
        const ME = '76561198016942077';
        if (player.steamID === ME) {
          // Get admins and show them to me, so I may contact them to know if everything is working fine with SquadTS in-game.
          const admins = getOnlineAdminsWithPermissions([AdminPerms.CanSeeAdminChat])
            // Place admin that also include Cameraman first (since they are more likely to be admin not just moderators)
            .sort(
              (a, b) =>
                Number(b.perms.includes(AdminPerms.Cameraman)) -
                Number(a.perms.includes(AdminPerms.Cameraman))
            )
            .map(p => p.player.nameWithClanTag ?? p.player.name ?? 'Unknown')
            .sort()
            .join(', ');
          rconSquad.warn(player.steamID, `This server is using SquadTS ! Online admins: ${admins}`);
        }
      });

      // Start interval updates for RCON updates.
      cachedGameStatus.watch();
      // Start downloading andd parsing logs
      await logParser.watch();

      logger.info('SquadTS server is ready');
    },
    unwatch: async () => {
      logger.info('SquadTS server is shutting down...');
      cachedGameStatus.unwatch();
      await rconSquad.disconnect();
      await logParser.unwatch();
      logger.info('SquadTS server is shut down');
    },
  } as const;
}
