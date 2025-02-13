import { SquadServer } from '../../src/squad-server';
import { SquadTSPlugin } from '../../src/plugin-loader/plugin.interface';
import { Logger } from 'pino';
import { KnifeBroadCastOptions } from './knife-broadcast.config';
import { delay, filter } from 'rxjs';

/**
 * Use game logs to find out name of the knife or wiki:
 * https://squad.fandom.com/wiki/Category:Melee_Weapons
 * https://squad.fandom.com/wiki/Weapons
 */
const KNIFE_IDS = [
  'BP_AK74Bayonet',
  'BP_AKMBayonet',
  'BP_Bayonet2000',
  'BP_G3Bayonet',
  'BP_M9Bayonet',
  'BP_OKC-3S',
  'BP_QNL-95_Bayonet',
  'BP_SA80Bayonet',
  'BP_SKS_Bayonet',
  'BP_SKS_Optic_Bayonet',
  'BP_SOCP_Knife_AUS',
  'BP_SOCP_Knife_ADF',
  'BP_VibroBlade_Knife_GC',
  'BP_SOCP_Knife_ADF_C',
  'BP_SA80Bayonet_C',
  'BP_Bayonet2000_C',
  'BP_AKMBayonet_C',
  'BP_G3Bayonet_C',
  'BP_M9Bayonet_C',
  'BP_SKS_Bayonet_C',
  'BP_OKC-3S_C',
  'BP_VibroBlade_Knife_GC_C',
  'BP_MeleeUbop_C',
  'BP_BananaClub_C',
  'BP_Droid_Punch_C',
  'BP_MagnaGuard_Punch_C',
  'BP_FAMAS_Bayonet_C',
  'BP_FAMAS_BayonetRifle_C',
  'BP_HK416_Bayonet_C'
];

// avoid the same index twice in a row
function controlledRandom<T>(array: T[], lastIndex: number | null = null): [T, number] {
  if (array.length < 2) {
    throw new Error("Array must contain at least two elements to avoid consecutive repetition.");
  }

  let randomIndex: number;

  do {
    randomIndex = Math.floor(Math.random() * array.length);
  } while (randomIndex === lastIndex);

  return [array[randomIndex], randomIndex];
}

const knifeBroadCast: SquadTSPlugin<KnifeBroadCastOptions> = async (server: SquadServer, connectors, logger: Logger, options) => {
  let lastIndex: number | null = null;
  server.events.playerWounded.pipe(
    filter(data => KNIFE_IDS.includes(data.weapon)),
    delay(options.delay * 1000),
  ).subscribe(async (data) => {
    const [message, newIndex] = controlledRandom(options.messages, lastIndex);
    // Update the lastIndex for the next iteration
    lastIndex = newIndex;

    await server.rcon.broadcast(
      message
        .replace('%attacker%', data.attacker.nameWithClanTag ?? data.attacker.name ?? 'Unknown')
        .replace('%victim%', data.victim.nameWithClanTag ?? data.victim.name ?? 'Unknown')
    );
  })
};

// noinspection JSUnusedGlobalSymbols
export default knifeBroadCast;

