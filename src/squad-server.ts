import { Logger } from "pino";
import { RconSquad } from './rcon-squad/use-rcon-squad';


export class SquadServer {

  constructor(
    private logger: Logger,
    private rcon: RconSquad) {
  }

  public async watch() {
    this.logger.info('Server started');
    await this.rcon.connect();

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
