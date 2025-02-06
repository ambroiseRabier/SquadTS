import { SquadTSPlugin } from '../../src/plugin-loader/plugin.interface';
import { useDiscordChannel } from '../discord-chat/use-discord-channel';
import { APIEmbed } from 'discord.js';
import { DiscordAdminCamLogsEnabledOptions } from './discord-cam-logs.config';


const DiscordAdminCamLogs: SquadTSPlugin<DiscordAdminCamLogsEnabledOptions> = async (server, connectors, logger, options) => {
  const { channelID } = options;
  const channel = await useDiscordChannel(connectors.discord, channelID);

  server.chatEvents.possessedAdminCamera.subscribe(async (data) => {
    const embed: APIEmbed = {
      title: `Admin Entered Admin Camera`,
      color: 16761867,
      fields: [
        {
          name: "Admin's Name",
          value: data.name ?? 'Unknown',
          inline: true
        },
        {
          name: "Admin's SteamID",
          value: `[${data.steamID}](https://steamcommunity.com/profiles/${data.steamID})`,
          inline: true
        },
        {
          name: "Admin's EosID",
          value: data.eosID,
          inline: true
        }
      ],
      timestamp: data.date.toISOString()
    };

    channel.send({embeds: [embed]});
  });

  server.chatEvents.unPossessedAdminCamera.subscribe(async (data) => {
    const embed: APIEmbed = {
        title: `Admin Left Admin Camera`,
        color: 16761867,
        fields: [
          {
            name: "Admin's Name",
            value: data.name ?? 'Unknown',
            inline: true
          },
          {
            name: "Admin's SteamID",
            value: `[${data.steamID}](https://steamcommunity.com/profiles/${data.steamID})`,
            inline: true
          },
          {
            name: "Admin's EosID",
            value: data.eosID,
            inline: true
          },
          {
            name: 'Time in Admin Camera',
            value: `${Math.round(data.duration / 60000)} mins`
          }
        ],
        timestamp: data.date.toISOString()
      };
    channel.send({embeds: [embed]});
  });

}

export default DiscordAdminCamLogs;
