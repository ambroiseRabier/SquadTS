import { Logger } from "pino";
import { RconSquad } from './rcon-squad/use-rcon-squad';
import { Options } from './config/parse-config';


export class SquadServer {

  constructor(
    private logger: Logger,
    private rcon: RconSquad,
    private options: Options) {
  }

  public async watch() {
    this.logger.info(`Beginning to watch ${this.options.rcon.host}:${this.options.rcon.port}...`);
    await this.rcon.connect();

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


    // a faire prio
    // this.setupLogParser();
    //

    // console.log(await this.rcon.getCurrentMap());
    // console.log(await this.rcon.getListPlayers());
    // console.log(await this.rcon.getSquads());
    // console.log(await this.rcon.getNextMap());
    // console.log(await this.rcon.broadcast("coucou dit l'oiseau"));

    // await this.rcon.getCurrentMap()
    // await this.rcon.getListPlayers()
    // await this.rcon.getSquads()


    // await this.rcon.connect();

  }

  async unwatch() {
    await this.rcon.disconnect();
  }

}
