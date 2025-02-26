import { SquadTSPlugin } from '../../src/plugin-loader/plugin.interface';
import { useDiscordChannel } from '../discord-chat/use-discord-channel';
import { APIEmbed } from 'discord.js';
import { DiscordAdminCamLogsEnabledOptions } from './discord-cam-logs.config';
import { formatDuration } from 'date-fns';

const discordAdminCamLogs: SquadTSPlugin<DiscordAdminCamLogsEnabledOptions> = async (
  server,
  connectors,
  logger,
  options
) => {
  const { channelID } = options;
  const channel = await useDiscordChannel(connectors.discord, channelID);

  server.chatEvents.possessedAdminCamera.subscribe(async data => {
    const embed: APIEmbed = {
      title: 'Admin Entered Admin Camera',
      color: 16761867,
      fields: [
        {
          name: 'Name',
          value: server.helpers.getPlayerDisplayName(data),
          inline: true,
        },
        {
          name: 'SteamID',
          value: `[${data.steamID}](https://steamcommunity.com/profiles/${data.steamID})`,
          inline: true,
        },
        {
          name: 'EosID',
          value: data.eosID,
          inline: true,
        },
      ],
      timestamp: data.date.toISOString(),
    };

    await channel.send({ embeds: [embed] });
  });

  server.chatEvents.unPossessedAdminCamera.subscribe(async data => {
    const embed: APIEmbed = {
      title: 'Admin Left Admin Camera',
      color: 16761867,
      fields: [
        {
          name: 'Name',
          value: server.helpers.getPlayerDisplayName(data),
          inline: true,
        },
        {
          name: 'SteamID',
          value: `[${data.steamID}](https://steamcommunity.com/profiles/${data.steamID})`,
          inline: true,
        },
        {
          name: 'EosID',
          value: data.eosID,
          inline: true,
        },
        {
          name: 'Duration',
          value: `${formatDuration({ seconds: data.duration / 1000 })}`,
        },
      ],
      timestamp: data.date.toISOString(),
    };
    await channel.send({ embeds: [embed] });
  });
};

export default discordAdminCamLogs;
