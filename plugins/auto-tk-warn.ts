import { AutoTKWarnOptions } from './auto-tk-warn.schema';
import { SquadServer } from '../src/squad-server';

export default function autoTKWarn(server: SquadServer, options: AutoTKWarnOptions){
  server.events.teamKill.subscribe(async (info) => {
    if (info.attacker && options.attackerMessage) {
      await server.rcon.warn(info.attacker.eosID, options.attackerMessage);
    }
    if (info.victim && options.victimMessage) {
      await server.rcon.warn(info.victim.eosID, options.victimMessage);
    }
  });
};

