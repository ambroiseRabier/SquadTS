import { SquadTSPlugin } from '../../src/plugin-loader/plugin.interface';
import { useDiscordChannel } from '../discord-chat/use-discord-channel';
import { DiscordAdminRequestEnabledOptions } from './discord-admin-request.config';
import { filter, tap } from 'rxjs';


const DiscordAdminRequest: SquadTSPlugin<DiscordAdminRequestEnabledOptions> = async (server, connectors, logger, options) => {
  const { channelID } = options;
  const channel = await useDiscordChannel(connectors.discord, channelID);

  server.chatEvents.command.pipe(
    filter(data => data.command === options.command),
    tap(async data => {
      if (data.message.length === 0) {
        await server.rcon.warn(
          data.player.eosID,
          options.messages.noMessage
        );
      }
    }),
    filter(data => data.message.length > 0),
    // todo get admins...
  ).subscribe(async (data) => {
    if () {

    }
  })
}

export default DiscordAdminRequest;
