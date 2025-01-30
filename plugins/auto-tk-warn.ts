// import BasePlugin from './base-plugin.js';

import { AutoTKWarnOptions, autoTKWarnSchema } from './auto-tk-warn.schema';
import { Plugin } from '../src/plugin-loader/plugin.interface';
import { SquadServer } from '../src/squad-server';

export default function autoTKWarn(server: SquadServer, options: AutoTKWarnOptions): Plugin {
  server.events.teamKill.subscribe(async (info) => {
    if (info.attacker && options.attackerMessage) {
      await server.rcon.warn(info.attacker.eosID, options.attackerMessage);
    }
    if (info.victim && options.victimMessage) {
      await server.rcon.warn(info.victim.eosID, options.victimMessage);
    }
  });

};

