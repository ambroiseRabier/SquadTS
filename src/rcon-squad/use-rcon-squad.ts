import { Rcon } from '../rcon/rcon';
import { useRconSquadExecute } from './use-rcon-squad-execute';
import { useSquadEvents } from './use-squad-events';
import { Subject } from 'rxjs';
import { Logger } from 'pino';
import { RconSquadConfig } from './rcon-squad.config';

// Utility type to avoid repetition.
export type RconSquad = ReturnType<typeof useRconSquad>;


export function useRconSquad(logger: Logger, rcon: Rcon) {

  return {
    // Since rcon is a class, it needs to be passed his own context, or this inside execute will be undefined.
    ...useRconSquadExecute(rcon.execute.bind(rcon)),
    ...useSquadEvents(logger, rcon.chatPacketEvent), // todo event here instead of overriding in

    connect: rcon.connect.bind(rcon),
    disconnect: rcon.disconnect.bind(rcon),
  };
}
