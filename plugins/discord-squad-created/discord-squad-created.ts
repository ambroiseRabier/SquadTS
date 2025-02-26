// noinspection JSUnusedGlobalSymbols

import { SquadTSPlugin } from '../../src/plugin-loader/plugin.interface';
import { useDiscordChannel } from '../discord-chat/use-discord-channel';
import { APIEmbed } from 'discord.js';
import { DiscordSquadCreatedConfig } from './discord-squad-created.config';

const discordSquadCreated: SquadTSPlugin<DiscordSquadCreatedConfig> = async (
  server,
  connectors,
  logger,
  options
) => {
  const { channelID } = options;
  const channel = await useDiscordChannel(connectors.discord, channelID);

  server.chatEvents.squadCreated.subscribe(async data => {
    if (options.useEmbed) {
      const embed: APIEmbed = {
        title: 'Squad Created',
        color: 16761867,
        fields: [
          {
            name: 'Player',
            value: server.helpers.getPlayerDisplayName(data.creator),
            inline: true,
          },
          {
            name: 'Team',
            value: data.teamName,
            inline: true,
          },
          {
            name: 'Squad Number & Squad Name',
            value: `${data.squadIndex} : ${data.squadName}`,
          },
        ],
        timestamp: new Date().toISOString(),
      };
      await channel.send({ embeds: [embed] });
    } else {
      await channel.send(
        ` \`\`\`Player: ${server.helpers.getPlayerDisplayName(data.creator)}\n created Squad ${data.squadIndex} : ${data.squadName}\n on ${data.teamName}\`\`\` `
      );
    }
  });
};

export default discordSquadCreated;

// If set, the plugin will only be loaded if the connectors are available.
// This means you won't have to deal with missing connectors errors.
export const requireConnectors = ['discord'];
