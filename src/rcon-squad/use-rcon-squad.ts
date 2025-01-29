import { Rcon } from '../rcon/rcon';
import { useRconSquadExecute } from './use-rcon-squad-execute';
import { useSquadEvents } from './use-squad-events';

// Utility type to avoid repetition.
export type RconSquad = ReturnType<typeof useRconSquad>;


export function useRconSquad(rcon: Rcon) {
  return {
    // Since rcon is a class, it needs to be passed his own context, or this inside execute will be undefined.
    ...useRconSquadExecute(rcon.execute.bind(rcon)),
    ...useSquadEvents(rcon.chatPacketEvent), // todo event here instead of overriding in

    connect: async () => {
      return rcon.connect();
    },

    disconnect: async () => {
      return rcon.disconnect();
    },
  };
}
