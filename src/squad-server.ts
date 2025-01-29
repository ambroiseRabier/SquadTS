import { Logger } from "pino";
import { RconSquad } from './rcon-squad/use-rcon-squad';
import { Options } from './config/config.schema';
import { LogParser } from './log-parser/use-log-parser';
import { filter, map } from 'rxjs';
import { isEvent } from './log-parser/log-parser-helpers';


export type SquadServer = ReturnType<typeof useSquadServer>;

export function useSquadServer(logger: Logger, rcon: RconSquad, logParser: LogParser, options: Options) {
  // const players = [];
  //
  // function getPlayerByName(name: string) {
  //   return players.find(player => player.name === name);
  // }

  return {
    rcon,
    events: {
      ...logParser.events,
      playerWounded: logParser.events.playerWounded.pipe(
        // todo async map ok ?
        map(async data => {
          return {
            ...data,
            victim: await getPlayerByName(data.victimName),
            // attacker: await getPlayerByEOSID(data.attackerIDs)
          };

          // data
          // data.teamkill = data.victim.teamID === data.attacker.teamID && data.victim.eosID !== data.attacker.eosID;
        })
      ),
      teamKill: logParser.events.playerWounded.pipe(
        map(data => {
          // data
          // data.teamkill = data.victim.teamID === data.attacker.teamID && data.victim.eosID !== data.attacker.eosID;
        })
      ),
    },
    watch: async () => {
      logger.info(`Beginning to watch ${options.rcon.host}:${options.rcon.port}...`);
      await rcon.connect();

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
      // console.log(await rcon.getListPlayers());
      // console.log(await this.rcon.getSquads());
      // console.log(await this.rcon.getNextMap());
      // console.log(await rcon.broadcast("coucou dit l'oiseau"));

      // await this.rcon.getCurrentMap()
      // await this.rcon.getListPlayers()
      // await this.rcon.getSquads()

      // await logParser.watch();

      logParser.events.adminBroadcast.subscribe((next) => {
        logger.debug(next);
      })

      await logParser.watch();

      // console.log(await rcon.broadcast("bonjour lui répond la corneille"));

    },
    unwatch: rcon.disconnect
  } as const;
}
