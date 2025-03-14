import { Logger } from 'pino';
import { RconSquad } from './rcon-squad/use-rcon-squad';
import { LogParser } from './log-parser/use-log-parser';
import { filter } from 'rxjs';
import { CachedGameStatus, Player } from './cached-game-status/use-cached-game-status';
import { omit } from 'lodash-es';
import { AdminPerms } from './admin-list/permissions';
import { RefinedLogEvents } from './cached-game-status/use-refined-log-events';
import { useHelpers } from './cached-game-status/use-helpers';
import { RefinedChatEvents } from './cached-game-status/use-refined-chat-events';
import { GithubWikiWeapon } from './github-info/github-weapons.type';
import { GithubWiki } from './github-info/github-layer.type';
import { AdminList } from './admin-list/use-admin-list';
import { promiseWithTimeout } from './utils';
import { SquadConfig } from './squad-config/use-squad-config';

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
  };
  squadConfig: SquadConfig;
}

export function useSquadServer({
  logger,
  rconSquad,
  logParser,
  cachedGameStatus,
  adminList,
  refinedLogEvents,
  refinedChatEvents,
  githubInfo,
  squadConfig,
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
    /**
     * Fetch squad server config.
     */
    squadConfig,

    /**
     * Information extract from the Github squad wiki repository.
     */
    githubInfo,

    /**
     * Parsed response of ShowServerInfo RCON command.
     */
    get info() {
      // Note important to make a getter, or it will return stale data!
      return cachedGameStatus.serverInfo$.getValue();
    },

    /**
     * Observable, you may subscribe to it to watch for change in server.info.
     */
    info$: cachedGameStatus.serverInfo$,

    /**
     * List of players at time of the call.
     */
    get players() {
      return cachedGameStatus.players$.getValue();
    },

    /**
     * Squad observable, you may subscribe to watch every change in players.
     */
    players$: cachedGameStatus.players$.asObservable(), // .asObservable() avoid accidentally calling .next from a plugin

    /**
     * Far more valuable than `playerConnected` event, as it provides significantly more detailed information.
     */
    addPlayer$: cachedGameStatus.addPlayer$,

    /**
     * Squad observable, you may subscribe to watch every change in squads.
     */
    squad$: cachedGameStatus.squads$.asObservable(),

    /**
     * List of squads at time of the call.
     */
    get squads() {
      return cachedGameStatus.squads$.getValue();
    },

    /**
     * Get a list of admins (and moderator, whitelist... anything inside Admins.cfg)
     */
    admins,

    /**
     * Events that you can react to.
     */
    events: {
      ...refinedLogEvents,
      teamKill,
      suicide,
      // Prevent accidentally using next by passing Subject as Observable.
      playersSquadChange: cachedGameStatus.playersSquadChange$.asObservable(),
    },

    /**
     * Chat events are provided by RCON.
     */
    chatEvents: refinedChatEvents,

    /**
     * List of eosID currently in admin cam
     */
    get adminsInAdminCam() {
      // A getter is probably unnecessary here, I believe the referene does not change.
      // But it is safer :)
      return rconSquad.adminsInAdminCam;
    },

    /**
     * Collection of helpers, re-usable logic.
     */
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
    /**
     * RCON API
     */
    rcon: omit(rconSquad, ['chatEvents', 'adminsInAdminCam']),

    /**
     *
     */
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
      await rconSquad.disconnect(); // todo, why here, just ask rcon directly in main.mts, added benefit is not need to drill disconnect into rconSquad
      await logParser.unwatch();
      logger.info('SquadTS server is shut down.');
      // Wait a bit for remaining logs to be displayed, especially useful for tests that are very fast.
      // Timeout of 1 sec, since logger.flush give unclear result when testing...

      // We need to flush pino logger logs before it doesn't seem like waiting for flush callback is
      // enough. And we end up with logs appearing after we process.exit(0)
      // This appear for the user as if the process is hanging.
      const flushPromise = new Promise<void>((resolve, reject) => {
        logger.flush(err => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
      // For tests in pre-commit hook, 1000 doesn't seem enough :/ ?
      await promiseWithTimeout(flushPromise, 2000, 'Flush timeout');
    },
  } as const;
}
