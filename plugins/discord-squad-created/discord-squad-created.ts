import { SquadTSPlugin } from '../../src/plugin-loader/plugin.interface';
import { useDiscordChannel } from '../discord-chat/use-discord-channel';
import { APIEmbed } from 'discord.js';
import { DiscordSquadCreatedConfig } from './discord-squad-created.config';


const DiscordSquadCreated: SquadTSPlugin<DiscordSquadCreatedConfig> = async (server, connectors, logger, options) => {
  const { channelID } = options;
  const channel = await useDiscordChannel(connectors.discord, channelID);


  server.events.playersSquadChange.subscribe(async (players) => {
    for (let player of players) {
      const teamName = server.helpers.getTeamName(player.teamID);
      const squadName = server.helpers.getPlayerSquad(player.eosID)?.name ?? 'Unknown';
      if (options.useEmbed) {
        const embed: APIEmbed = {
          title: `Squad Created`,
          color: 16761867,
          fields: [
            {
              name: 'Player',
              value: player.name ?? 'Unknown',
              inline: true
            },
            {
              name: 'Team',
              value: teamName,
              inline: true
            },
            {
              name: 'Squad Number & Squad Name',
              value: `${player.squadID} : ${squadName}`
            }
          ],
          // We do not have a squad change event in logs, so the squad change date is depending
          // on how often rcon get players.
          timestamp: (new Date()).toISOString()
        };
        await channel.send({embeds: [embed]});
      } else {
        await channel.send(
          ` \`\`\`Player: ${player.name}\n created Squad ${player.squadID} : ${squadName}\n on ${teamName}\`\`\` `
        );
      }
    }

  });
}

export default DiscordSquadCreated;
