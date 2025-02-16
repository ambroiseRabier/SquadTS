import { Logger } from "pino";
import { RconSquad } from './rcon-squad/use-rcon-squad';
import { LogParser } from './log-parser/use-log-parser';
import { filter } from 'rxjs';
import { CachedGameStatus, Player } from './cached-game-status/use-cached-game-status';
import { omit } from "lodash";
import { AdminList } from './admin-list/use-admin-list';
import { AdminPerms } from './admin-list/permissions';


export type SquadServer = ReturnType<typeof useSquadServer>;

interface Props {
  logger: Logger;
  rconSquad: RconSquad;
  logParser: LogParser;
  cachedGameStatus: CachedGameStatus;
  adminList: AdminList;
}

export function useSquadServer({logger, rconSquad, logParser, cachedGameStatus, adminList}: Props) {
  const {admins, fetch: fetchAdmins, getAdminsWithPermissions} = adminList;

  /**
   * Exclude suicide
   */
  const teamKill = cachedGameStatus.events.playerWounded.pipe(
    filter(({attacker, victim}) =>
      attacker.teamID === victim.teamID && attacker.eosID !== victim.eosID)
  );

  /**
   * Same player
   */
  const suicide = cachedGameStatus.events.playerWounded.pipe(
    filter(({attacker, victim}) => attacker.eosID === victim.eosID)
  );

  // todo tmp, finish implementing when we need it...
  //const githubLayer: GithubWiki.Layer = {} as any;

  const getOnlineAdminsWithPermissions = (permissions: AdminPerms[]) => {
    const steamIDAndPerms = getAdminsWithPermissions(permissions);
    return steamIDAndPerms
      .map(([steamId64, perms]) => ({
        player: cachedGameStatus.getters.getPlayerBySteamID(steamId64),
        perms
      }))
      .filter((obj): obj is { player: Player; perms: AdminPerms[] } => !!obj.player);
  }

  return {
    //githubLayer,
    info: cachedGameStatus.serverInfo,
    get players() {
      return cachedGameStatus.players$.getValue();
    },
    players$: cachedGameStatus.players$,
    /**
     * Far more valuable than `playerConnected`, as it provides significantly more detailed information.
     */
    addPlayer$: cachedGameStatus.addPlayer$,
    get squads() {
      return cachedGameStatus.squads$.getValue();
    },
    admins,
    events: {
      ...cachedGameStatus.events,
      teamKill,
      suicide
    },
    chatEvents: cachedGameStatus.chatEvents,
    adminsInAdminCam: rconSquad.adminsInAdminCam,
    helpers: {
      ...cachedGameStatus.getters,
      getOnlineAdminsWithPermissions,
      playerHasPermissions: (eosID: string, permissions: AdminPerms[]) => {
        return getOnlineAdminsWithPermissions(permissions).some(admin => admin.player.eosID === eosID);
      }
    },
    // Omit chatEvent as cachedGameStatus enrich them with player, and this one should be used by plugins.
    rcon: omit(rconSquad, ['chatEvents', 'adminsInAdminCam']),
    prepare: async () => {
      // Update admin list once at startup, and at each new game start. (arbitrary)
      await fetchAdmins();
      cachedGameStatus.events.newGame.subscribe(async () => {
        await fetchAdmins();
      });

      logParser.setEmitLogs(false);
      // First log download will be past logs (depend on max file size of logs) (of any date)
      await logParser.watch();
    },
    watch: async () => {
      // ;)
      logParser.events.playerConnected.subscribe(player => {
        const ME = '76561198016942077';
        if (player.steamID === ME) {
          // Get admins and show them to me, so I may contact them to know if everything is working fine with SquadTS in-game.
          const admins = getOnlineAdminsWithPermissions([AdminPerms.CanSeeAdminChat])
            // Place admin that also include Cameraman first (since they are more likely to be admin not just moderators)
            .sort((a,b) => Number(b.perms.includes(AdminPerms.Cameraman)) - Number(a.perms.includes(AdminPerms.Cameraman)))
            .map(p => p.player.nameWithClanTag ?? p.player.name ?? 'Unknown')
            .sort()
            .join(', ');
          rconSquad.warn(player.steamID, `This server is using SquadTS ! Online admins: ${admins}`);
        }
      })

      logParser.setEmitLogs(true);

      // Call after logParser starts
      cachedGameStatus.watch();

      logger.info('SquadTS server is ready');
    },
    unwatch: rconSquad.disconnect.bind(rconSquad) // todo pr tests
  } as const;
}
