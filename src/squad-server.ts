import { RconSquad } from './rcon/rcon-squad';
import { Logger } from "pino";


export class SquadServer {

  constructor(
    private logger: Logger,
    private rcon: RconSquad) {
  }

  public async watch() {
    this.logger.info('Server started');

    this.setupRCON();


    // await this.rcon.connect();

  }

  private setupRCON() {
    this.rcon.on('CHAT_MESSAGE', async (data) => {
      data.player = await this.getPlayerByEOSID(data.eosID);
      this.emit('CHAT_MESSAGE', data);

      const command = data.message.match(/!([^ ]+) ?(.*)/);
      if (command)
        this.emit(`CHAT_COMMAND:${command[1].toLowerCase()}`, {
          ...data,
          message: command[2].trim()
        });
    });
  }
}
