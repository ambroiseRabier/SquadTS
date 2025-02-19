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
  server.events.teamKill.subscribe(async info => {
    const attackerName = info.attacker.nameWithClanTag ?? info.attacker.name ?? 'Unknown';
    logger.info(`TK Warn: ${attackerName} (eosID: ${info.attacker.eosID})`);
    await server.rcon.warn(info.attacker.eosID, options.attackerMessage);
    await server.rcon.warn(
      info.victim.eosID,
      options.victimMessage.replace('%attacker%', attackerName)
    );
  });
};

// noinspection JSUnusedGlobalSymbols
export default autoTKWarn;
