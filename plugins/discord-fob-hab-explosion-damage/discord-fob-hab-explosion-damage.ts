import { SquadTSPlugin } from '../../src/plugin-loader/plugin.interface';
import { useDiscordChannel } from '../discord-chat/use-discord-channel';
import { APIEmbed } from 'discord.js';
import { DiscordFOBExplosionEnabledOptions } from './discord-fob-hab-explosion-damage.config';

const discordFOBHABExplosionDamage: SquadTSPlugin<DiscordFOBExplosionEnabledOptions> = async (
  server,
  connectors,
  logger,
  options
) => {
  const { channelID } = options;
  const channel = await useDiscordChannel(connectors.discord, channelID);

  // e.g. log: LogSquadTrace: [DedicatedServer]ASQDeployable::TakeDamage(): BP_FOBRadio_Woodland_C_2142568398: 500.00 damage attempt by causer BP_Deployable_M112_C4Explosive_Timed_C_2142568181 instigator Yuca with damage type BP_Explosives_Damagetype_C health remaining 236.08
  server.events.deployableDamaged.subscribe(async data => {
    if (!data.deployable.match(/(?:FOBRadio|Hab)_/i)) return;
    if (!data.weapon.match(/_Deployable_/i)) return; // C4 but not rockets, grenades, vehicles...

    const embed: APIEmbed = {
      title: `FOB/HAB Explosion Damage: ${server.helpers.getPlayerDisplayName(data.attacker)}`,
      color: 16761867,
      fields: [
        {
          name: 'Attacker',
          value: server.helpers.getPlayerDisplayName(data.attacker),
          inline: true,
        },
        {
          name: 'SteamID',
          value: `[${data.attacker.steamID}](https://steamcommunity.com/profiles/${data.attacker.steamID})`,
          inline: true,
        },
        {
          name: 'EosID',
          value: data.attacker.eosID,
          inline: true,
        },
        {
          name: 'Deployable',
          value: data.deployable,
        },
        {
          name: 'Weapon',
          value: data.weapon,
        },
      ],
      timestamp: data.date.toISOString(),
    };

    await channel.send({ embeds: [embed] });
  });
};

export default discordFOBHABExplosionDamage;
