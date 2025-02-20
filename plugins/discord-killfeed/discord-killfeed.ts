import { SquadTSPlugin } from '../../src/plugin-loader/plugin.interface';
import { useDiscordChannel } from '../discord-chat/use-discord-channel';
import { APIEmbed } from 'discord.js';
import { DiscordKillfeedOptions } from './discord-killfeed.config';

const discordKillfeed: SquadTSPlugin<DiscordKillfeedOptions> = async (
  server,
  connectors,
  logger,
  options
) => {
  const { channelID } = options;
  const channel = await useDiscordChannel(connectors.discord, channelID);

  server.events.playerWounded.subscribe(async data => {
    const embed: APIEmbed = {
      title: `KillFeed: ${data.attacker.name}`,
      color: 16761867,
      fields: [
        {
          name: "Attacker's Name",
          value: data.attacker.name ?? 'Unknown',
          inline: true,
        },
        {
          name: "Attacker's SteamID",
          value: `[${data.attacker.steamID}](https://steamcommunity.com/profiles/${data.attacker.steamID})`,
          inline: true,
        },
        {
          name: "Attacker's EosID",
          value: data.attacker.eosID,
          inline: true,
        },
        {
          name: 'Weapon',
          value: data.weapon,
        },
        {
          name: "Victim's Name",
          value: data.victim?.name ?? 'Unknown',
          inline: true,
        },
        {
          name: "Victim's SteamID",
          value: data.victim
            ? `[${data.victim.steamID}](https://steamcommunity.com/profiles/${data.victim.steamID})`
            : 'Unknown',
          inline: true,
        },
        {
          name: "Victim's EosID",
          value: data.victim ? data.victim.eosID : 'Unknown',
          inline: true,
        },
        {
          name: 'Community Ban List',
          value: `[Attacker's Bans](https://communitybanlist.com/search/${data.attacker.steamID})`,
        },
      ],
      timestamp: data.date.toISOString(),
    };
    await channel.send({ embeds: [embed] });
  });
};

export default discordKillfeed;
