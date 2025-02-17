import { SquadServer } from '../../src/squad-server';
import { SquadTSPlugin } from '../../src/plugin-loader/plugin.interface';
import { Logger } from 'pino';
import { HeliCrashBroadCastOptions } from './heli-crash-broadcast.config';
import { filter, tap } from 'rxjs';

/**
 * Use vehicle spawn command in local server.
 * Also check:
 * https://squad.fandom.com/wiki/Category:Helicopters
 * https://squad.fandom.com/wiki/Spawn_Commands#Spawn_Helicopter:
 */
const HELI_IDS = [
  'BP_MI8',
  'BP_MI8_VDV',
  'BP_MI17_MEA',
  'BP_CH178',
  'BP_UH60',
  'BP_UH60_AUS',
  'BP_UH1Y',
  'BP_UH1H_Desert',
  'BP_UH1H',
  'BP_SA330',
  'BP_MRH90_Mag58',
  'BP_CH146',
  'BP_CH146_Raven',
  'BP_Z8G',
  'BP_Z8J',
  'BP_Loach',
  'BP_Loach_CAS_Small',
];

// avoid the same index twice in a row
function controlledRandom<T>(
  array: T[],
  lastIndex: number | null = null
): [T, number] {
  // if (array.length < 2) {
  //   throw new Error("Array must contain at least two elements to avoid consecutive repetition.");
  // }

  let randomIndex: number;

  do {
    randomIndex = Math.floor(Math.random() * array.length);
  } while (randomIndex === lastIndex);

  return [array[randomIndex], randomIndex];
}

const heliCrashBroadcast: SquadTSPlugin<HeliCrashBroadCastOptions> = async (
  server: SquadServer,
  connectors,
  logger: Logger,
  options
) => {
  let lastIndex: number | null = null;
  server.events.playerDied
    .pipe(
      // Actual killer weapon will be BP_MI8_C_2147214443 not BP_MI8_C or BP_MI8, so we do a partial match
      filter((data) => HELI_IDS.some((heliID) => data.weapon.includes(heliID)))
    )
    .subscribe(async (data) => {
      const [message, newIndex] = controlledRandom(options.messages, lastIndex);
      // Update the lastIndex for the next iteration
      lastIndex = newIndex;

      // on suicide, victim and attacker are the same.
      await server.rcon.broadcast(
        message.replace(
          '%pilot%',
          data.attacker.nameWithClanTag ?? data.attacker.name ?? 'Unknown'
        )
      );
    });
};

// noinspection JSUnusedGlobalSymbols
export default heliCrashBroadcast;
