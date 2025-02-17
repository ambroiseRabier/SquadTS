import { AutoTKWarnOptions } from './auto-tk-warn.config';
import { SquadServer } from '../../src/squad-server';
import { SquadTSPlugin } from '../../src/plugin-loader/plugin.interface';
import { Logger } from 'pino';

const autoTKWarn: SquadTSPlugin<AutoTKWarnOptions> = async (
  server: SquadServer,
  connectors,
  logger: Logger,
  options
) => {
  server.events.teamKill.subscribe(async (info) => {
    logger.info(
      `TK Warn: ${info.attacker.nameWithClanTag ?? info.attacker.name} (eosID: ${info.attacker.eosID})`
    );
    if (info.attacker && options.attackerMessage) {
      await server.rcon.warn(info.attacker.eosID, options.attackerMessage);
    }
    if (info.victim && options.victimMessage) {
      await server.rcon.warn(info.victim.eosID, options.victimMessage);
    }
  });
};

// noinspection JSUnusedGlobalSymbols
export default autoTKWarn;
