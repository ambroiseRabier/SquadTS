import { SquadTSPlugin } from '../../src/plugin-loader/plugin.interface';
import { DiscordAdminBroadcastEnabledOptions } from './discord-admin-broadcast.config';
import { useDiscordChannel } from '../discord-chat/use-discord-channel';
import { APIEmbed } from 'discord.js';

const discordAdminBroadcast: SquadTSPlugin<DiscordAdminBroadcastEnabledOptions> = async (
  server,
  connectors,
  logger,
  options
) => {
  const { channelID } = options;
  const channel = await useDiscordChannel(connectors.discord, channelID);

  server.events.adminBroadcast.subscribe(async data => {
    const embed: APIEmbed = {
      title: 'Admin Broadcast',
      color: 16761867,
      fields: [
        // {
        //   name: 'From',
        //   value: data.from, // Do not use from, it gives garbage data.
        // },
        {
          name: 'Message',
          value: data.message,
        },
      ],
      timestamp: data.date.toISOString(),
    };
    await channel.send({ embeds: [embed] });
  });
};

// noinspection JSUnusedGlobalSymbols
export default discordAdminBroadcast;
