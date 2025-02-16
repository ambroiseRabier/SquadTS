import { SquadTSPlugin } from '../../src/plugin-loader/plugin.interface';
import { useDiscordChannel } from '../discord-chat/use-discord-channel';
import { DiscordAdminRequestEnabledOptions } from './discord-admin-request.config';
import { filter, tap } from 'rxjs';
import { AdminPerms } from '../../src/admin-list/permissions';
import { APIEmbed } from 'discord.js';
import { debounce } from 'lodash-es';


const DiscordAdminRequest: SquadTSPlugin<DiscordAdminRequestEnabledOptions> = async (server, connectors, logger, options) => {
  const { channelID } = options;
  const channel = await useDiscordChannel(connectors.discord, channelID);
  const debouncedAddDiscordPing = debounce(() => true, options.debounceDiscordPing * 1000);

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
  ).subscribe(async (data) => {
    const admins = server.helpers.getOnlineAdminsWithPermissions([AdminPerms.CanSeeAdminChat])

    let adminNotified = 0;
    for (let admin of admins) {
      await server.rcon.warn(admin.player.eosID, `[${data.player.name}] - ${data.message}`);
      adminNotified++;
    }

    const embed: APIEmbed = {
      title: `${data.player.name} has requested admin support!`,
      color: 16761867,
      fields: [
        {
          name: 'Player',
          value: data.player.name ?? "Unknown",
          inline: true
        },
        {
          name: 'SteamID',
          value: `[${data.player.steamID}](https://steamcommunity.com/profiles/${data.player.steamID})`,
          inline: true
        },
        {
          name: "Player's EosID",
          value: data.player.eosID,
          inline: true
        },
        {
          name: 'Team & Squad',
          value: `Team: ${data.player.teamID}, Squad: ${data.player.squadID || 'Unassigned'}`
        },
        {
          name: 'Message',
          value: data.message
        },
        {
          name: 'Admins Notified',
          value: adminNotified.toString()
        }
      ],
      timestamp: data.date.toISOString()
    };


    const req: Parameters<typeof channel.send>[0] = {
      embeds: [embed]
    };

    const pingStr = options.pingHere && !!debouncedAddDiscordPing() ? '@here - ' : '';
    const groupPingStr = options.pingGroups.length > 0 ? ' - ' + options.pingGroups
      .map((groupID) => `<@&${groupID}>`)
      .join(' ') : '';
    req.content = pingStr + `Admin Requested in ${server.info.serverName}` + groupPingStr;

    await channel.send(req);

    // Send different messages depending on numbers of online admins, and if server
    // wants to disclose absence of in-game admin.
    if (options.showInGameAdmins) {
      if (adminNotified === 0) {
        await server.rcon.warn(
          data.player.eosID,
          options.messages.noInGameAdminNotification
        );
      } else {
        await server.rcon.warn(
          data.player.eosID,
          // options.messages.adminInGameNotification // not implemented yet... (plural form is tedious to handle)
          `There ${adminNotified > 1 ? 'are' : 'is'} ${adminNotified} in-game admin${adminNotified > 1 ? 's' : ''}.`+
          `Please wait for us to get back to you.`
        );
      }
    } else {
      await server.rcon.warn(
        data.player.eosID,
        options.messages.neutralAdminNotification
      );
    }
  })
}

export default DiscordAdminRequest;
