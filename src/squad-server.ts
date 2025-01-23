import { RconSquad } from './rcon-squad';
import { Logger } from "pino";


export class SquadServer {

  constructor(
    private logger: Logger,
    private rcon: RconSquad) {
  }

  public async watch() {
    this.logger.info('Server started');

    // await this.rcon.connect();

  }
}
