import { useRconSquadExecute } from './use-rcon-squad-execute';
import { Logger } from 'pino';
import { RconSquadConfig } from './rcon-squad.config';
import { useSquadEvents } from './squad-events/use-squad-events';
import { Rcon } from '../rcon/use-rcon';

// Utility type to avoid repetition.
export type RconSquad = ReturnType<typeof useRconSquad>;

export function useRconSquad(logger: Logger, rcon: Rcon, config: RconSquadConfig) {
  if (config.dryRun) {
    logger.warn('Dry run mode enabled, game modifying commands will not be executed.');
  }

  return {
    // Since rcon is a class, it needs to be passed his own context, or this inside execute will be undefined.
    ...useRconSquadExecute(rcon.execute, config.dryRun, logger),
    ...useSquadEvents(logger, rcon.chatPacketEvent),

    // Bind is needed here because RCON is a class.
    connect: rcon.connect,
    disconnect: rcon.disconnect,
  };
}
