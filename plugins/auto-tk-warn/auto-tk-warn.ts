import { AutoTKWarnOptions } from './auto-tk-warn.config';
import { SquadServer } from '../../src/squad-server';
import { SquadTSPlugin } from '../../src/plugin-loader/plugin.interface';
import { Logger } from 'pino';
import { wait } from '../../src/utils';

const autoTKWarn: SquadTSPlugin<AutoTKWarnOptions> = async (
  server: SquadServer,
  connectors,
  logger: Logger,
  options
) => {
  server.events.teamKill.subscribe(async info => {
    const attackerName = info.attacker.nameWithClanTag ?? info.attacker.name ?? 'Unknown';
    logger.info(`TK Warn: ${attackerName} (eosID: ${info.attacker.eosID})`);

    await Promise.all([
      await wait(options.attackerMessageDelay * 1000).then(async () => {
        await server.rcon.warn(info.attacker.eosID, options.attackerMessage);
      }),
      await wait(options.victimMessageDelay * 1000).then(async () => {
        await server.rcon.warn(
          info.victim.eosID,
          options.victimMessage.replace('%attackerName%', attackerName)
        );
      }),
    ]);
  });
};

// noinspection JSUnusedGlobalSymbols
export default autoTKWarn;
