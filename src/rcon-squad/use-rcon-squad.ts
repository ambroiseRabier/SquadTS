import { Rcon } from '../rcon/rcon';
import { useRconSquadExecute } from './use-rcon-squad-execute';
import { useSquadEvents } from './use-squad-events';

// Utility type to avoid repetition.
export type RconSquad = ReturnType<typeof useRconSquad>;


export function useRconSquad(rcon: Rcon) {
  return {
    ...useRconSquadExecute(rcon.execute),
    ...useSquadEvents(rcon.chatPacketEvent), // todo event here instead of overriding in

    connect: async () => {
      return rcon.connect();
    },

    disconnect: async () => {
      return rcon.disconnect();
    },
  };
}
