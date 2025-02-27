import { APIEmbed } from 'discord.js';
import { SquadServer } from '../../../src/squad-server';

export function generateMessage(server: SquadServer) {
  const players = [
    `${server.info.a2sPlayerCount}`,
    server.info.publicQueue + server.info.reserveQueue > 0 &&
      `(+${server.info.publicQueue + server.info.reserveQueue})`,
    ` / ${server.info.publicSlots}`,
    server.info.reserveSlots > 0 && `(+${server.info.reserveSlots})`,
  ]
    .filter(Boolean)
    .join('');

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
          server.info.nextLayer ?? (server.info.nextLayerToBeVoted ? 'To be voted' : 'Unknown')
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
  return { embeds: [embed] };
}
