import { Logger } from "pino";
import { RconSquad } from './rcon-squad/use-rcon-squad';
import { LogParser } from './log-parser/use-log-parser';
import { filter } from 'rxjs';
import { CachedGameStatus, Player } from './cached-game-status/use-cached-game-status';
import { omit } from "lodash";
import { AdminList } from './admin-list/use-admin-list';
import { AdminPerms } from './admin-list/permissions';
import { GithubWiki } from './layer-info/github-layer.type';


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

  return {
    //githubLayer,
    info: cachedGameStatus.serverInfo,
    players: cachedGameStatus.players$.getValue(),
    squads: cachedGameStatus.squads$.getValue(),
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
      getOnlineAdminsWithPermissions: (permissions: AdminPerms[]) => {
        const steamIDAndPerms = getAdminsWithPermissions(permissions);
        return steamIDAndPerms
          .map(([steamId64, perms]) => ({
            player: cachedGameStatus.getters.getPlayerBySteamID(steamId64),
            perms
          }))
          .filter((obj): obj is { player: Player; perms: AdminPerms[] } => !!obj.player);
      }
    },
    // Omit chatEvent as cachedGameStatus enrich them with player, and this one should be used by plugins.
    rcon: omit(rconSquad, ['chatEvents', 'adminsInAdminCam']),
    watch: async () => {

      // todo: useful for plugins where you don oh way, admin can't be kicked ...
      // based on permission: "canseeadminchat",
      // also used to warn admins in game that there is a discord request.
      // big questions is: what is adminList options based upon ? Does it includes moderator ?
      // is it supposed to be the admin/moderator/whitelist file from squad server perhaps ?
      //this.admins = await fetchAdminLists(this.options.adminLists);

      // soi recup layer depuis wiki comme lui, soi on peut depuis logs si je suppose server recemment lancé,
      // soi manuel avec git ?
      // await Layers.pull();

      // pingSquadJSAPI interessant, recup info sur qui utiliser quel plugin.

      // console.log(await this.rcon.getCurrentMap());
      // console.log(await rconSquad.getListPlayers());
      // console.log(await this.rcon.getSquads());
      // console.log(await this.rcon.getNextMap());
      // console.log(await rconSquad.showServerInfo());
      // console.log('cc -    - --------')
      // console.log(await rconSquad.getCurrentMap());
      // console.log(await rcon.broadcast("coucou dit l'oiseau"));

      // await this.rcon.getCurrentMap()
      // await this.rcon.getListPlayers()
      // await this.rcon.getSquads()

      // await logParser.watch();


      // logParser.events.adminBroadcast.subscribe((next) => {
      //   logger.debug(next);
      // })
      // rconSquad.chatEvent.subscribe((next) => {
      //   logger.debug('chatevent (tmp):', next);
      // })

      // todo: make cachedGameStatus ready before, and enrich data ? but prevent old logs to emit events.
      // todo: make a ignore log if date is too far ? but not in tests. Could have avantage on restarting SquadTS middle game
      //       it would still react to the previous 10sec ? without reacting to the 5min it was down ?
      //       not worth it ?

      // First log download will be past logs (depend on max file size of logs) (of any date)
      await logParser.watch();

      // Update admin list once at startup, and at each new game start. (arbitrary)
      await fetchAdmins()
      cachedGameStatus.events.newGame.subscribe(async () => {
        await fetchAdmins()
      });


      // Call after logParser starts
      cachedGameStatus.watch()
    },
    unwatch: rconSquad.disconnect.bind(rconSquad)
  } as const;
}
