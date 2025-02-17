import { SquadTSPlugin } from '../../src/plugin-loader/plugin.interface';
import { useDiscordChannel } from '../discord-chat/use-discord-channel';
import { APIEmbed } from 'discord.js';
import { DiscordServerStatusOptions } from './discord-server-status.config';
import { exhaustMap, interval } from 'rxjs';

const DiscordServerStatus: SquadTSPlugin<DiscordServerStatusOptions> = async (
  server,
  connectors,
  logger,
  options
) => {
  const { channelID } = options;
  const channel = await useDiscordChannel(connectors.discord, channelID);

  interval(options.updateFrequency * 1000)
    .pipe(
      exhaustMap(async data => {
        const players = [
          `${server.info.a2sPlayerCount}`,
          server.info.publicQueue + server.info.reserveQueue > 0 &&
            `(+${server.info.publicQueue + server.info.reserveQueue})`,
          ` / ${server.info.publicSlots}`,
          server.info.reserveSlots > 0 && `(+${server.info.reserveSlots})`,
        ]
          .filter(Boolean) // Removes any `false` or `undefined` values
          .join(''); // Joins the valid parts into a string

        const embed: APIEmbed = {
          title: server.info.serverName,
          fields: [
            {
              name: 'Players',
              value: players,
            },
            {
              name: 'Current Layer',
              value: `\`\`\`${server.info.currentLayer ?? 'Unknown'}\`\`\``,
              inline: true,
            },
            {
              name: 'Next Layer',
              value: `\`\`\`${
                server.info.nextLayer ??
                (server.info.nextLayerToBeVoted ? 'To be voted' : 'Unknown')
              }\`\`\``,
              inline: true,
            },
          ],
          color: 16761867,
          timestamp: new Date().toISOString(),
          // Dont use CDN for images, use raw.githubusercontent.com.
          // Also not updated for 8.x properly.
          image: {
            url: `https://raw.githubusercontent.com/Squad-Wiki/squad-wiki-pipeline-map-data/master/completed_output/_Current%20Version/images/${server.info.currentLayer}.jpg`,
          },
        };
        await channel.send({ embeds: [embed] });

        if (options.setBotStatus) {
          connectors.discord.user?.setActivity(
            `(${server.info.a2sPlayerCount}/${server.info.publicSlots}) ${server.info.currentLayer ?? 'Unknown'}`,
            { type: 4 }
          );
        }
      })
    )
    .subscribe();
};

export default DiscordServerStatus;
