import { RconSquad } from './rcon/rcon-squad';
import { Logger } from "pino";


export class SquadServer {

  constructor(
    private logger: Logger,
    private rcon: RconSquad) {
  }

  public async watch() {
    this.logger.info('Server started');
    await this.rcon.connect();

    // console.log(await this.rcon.getCurrentMap());
    console.log(await this.rcon.getListPlayers());
    // console.log(await this.rcon.getSquads());

    // await this.rcon.getCurrentMap()
    // await this.rcon.getListPlayers()
    // await this.rcon.getSquads()


    // await this.rcon.connect();

  }

  async unwatch() {
    await this.rcon.disconnect();
  }

}
