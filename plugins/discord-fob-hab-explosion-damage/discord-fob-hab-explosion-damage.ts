import { SquadTSPlugin } from '../../src/plugin-loader/plugin.interface';
import { useDiscordChannel } from '../discord-chat/use-discord-channel';
import { APIEmbed } from 'discord.js';
import { DiscordFOBExplosionEnabledOptions } from './discord-fob-hab-explosion-damage.config';

const DiscordFOBHABExplosionDamage: SquadTSPlugin<DiscordFOBExplosionEnabledOptions> = async (
  server,
  connectors,
  logger,
  options
) => {
  const { channelID } = options;
  const channel = await useDiscordChannel(connectors.discord, channelID);

  server.events.deployableDamaged.subscribe(async data => {
    if (!data.deployable.match(/(?:FOBRadio|Hab)_/i)) return;
    if (!data.weapon.match(/_Deployable_/i)) return;
    if (!data.attacker) return;

    const embed: APIEmbed = {
      title: `FOB/HAB Explosion Damage: ${data.attacker.name}`,
      color: 16761867,
      fields: [
        {
          name: "Player's Name",
          value: data.attacker.name ?? 'Unknown', // Well, hopefully nobody call themselves Unknown...
          inline: true,
        },
        {
          name: "Player's SteamID",
          value: `[${data.attacker.steamID}](https://steamcommunity.com/profiles/${data.attacker.steamID})`,
          inline: true,
        },
        {
          name: "Player's EosID",
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

export default DiscordFOBHABExplosionDamage;
