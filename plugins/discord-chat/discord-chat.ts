import { APIEmbed } from 'discord.js';
import { SquadTSPlugin } from '../../src/plugin-loader/plugin.interface';
import { DiscordChatEnabledOptions } from './discord-chat.config';
import { useDiscordChannel } from './use-discord-channel';
import { filter } from 'rxjs';

const discordChat: SquadTSPlugin<DiscordChatEnabledOptions> = async (
  server,
  connectors,
  logger,
  options
) => {
  const { channelID } = options;
  const channel = await useDiscordChannel(connectors.discord, channelID);

  server.chatEvents.message
    .pipe(filter(data => !options.excludeChat.includes(data.chat)))
    .subscribe(async data => {
      const embed: APIEmbed = {
        title: data.chat,
        color: 16761867, // Color in decimal
        fields: [
          {
            name: 'Player',
            value: data.name,
            inline: true,
          },
          {
            name: 'SteamID',
            value: `[${data.player.steamID}](https://steamcommunity.com/profiles/${data.player.steamID})`,
            inline: true,
          },
          {
            name: 'EosID',
            value: data.player.eosID,
            inline: true,
          },
          {
            name: 'Team & Squad',
            value: `Team: ${data.player.teamID}, Squad: ${data.player.squadIndex || 'Unassigned'}`,
          },
          {
            name: 'Message',
            value: `${data.message}`,
          },
        ],
        timestamp: data.date.toISOString(), // ISO string timestamp
      };

      // Note: Since discord v13, we should use embeds with "s" instead of "embed",
      //       And the type has become array instead of an object.
      await channel.send({
        embeds: [embed],
      });
    });
};

// noinspection JSUnusedGlobalSymbols
export default discordChat;
