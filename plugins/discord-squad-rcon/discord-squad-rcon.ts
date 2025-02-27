// noinspection JSUnusedGlobalSymbols

import { SquadTSPlugin } from '../../src/plugin-loader/plugin.interface';
import { DiscordSquadRconOptions } from './discord-squad-rcon.config';
import { Message, OmitPartialGroupDMChannel } from 'discord.js';

const discordSquadRcon: SquadTSPlugin<DiscordSquadRconOptions> = async (
  server,
  connectors,
  logger,
  options
) => {
  function hasPermission(
    message: OmitPartialGroupDMChannel<Message<boolean>>,
    commandBase: string
  ) {
    if (!message.member) {
      throw new Error('message.member is nullish.');
    }

    // No permissions list means everything is allowed.
    if (options.roleToCommands.size === 0) {
      return true;
    } else {
      for (const [role, commands] of options.roleToCommands) {
        if (message.member.roles.cache.has(role)) {
          if (commands.map(p => p.toLowerCase()).includes(commandBase.toLowerCase())) {
            return true;
          }
        }
      }
    }
  }

  function getAllowedCommands(message: OmitPartialGroupDMChannel<Message<boolean>>) {
    if (!message.member) {
      throw new Error('message.member is nullish.');
    }

    const allowedCommands = new Set<string>();

    for (const [role, commands] of options.roleToCommands) {
      if (message.member.roles.cache.has(role)) {
        commands.forEach(p => allowedCommands.add(p));
      }
    }

    return Array.from(allowedCommands).join(', ');
  }

  async function onDiscordMessage(message: OmitPartialGroupDMChannel<Message<boolean>>) {
    // check the author of the message is not a bot and that the channel is the RCON console channel
    // message.member is null if:
    // 1. When the message is from a DM (Direct Message) channel
    // 2. When the message is from a Group DM channel
    // 3. When the message is from a webhook
    // 4. When the message is system-generated
    if (!message.member || message.author.bot || message.channel.id !== options.channelID) {
      return;
    }

    let command = message.content; // ex: AdminChangeLayer Sumari
    const match = command.match(/([^ ]+)/);
    const commandBase = match ? match[1] : undefined; // ex: AdminChangeLayer

    // Empty content should not happen, but who knows, perhaps if you send an image?
    if (!commandBase) {
      await message.reply('Command is empty.');
      return;
    }

    // Check that the admin has permissions, if permissions is set.
    if (!hasPermission(message, commandBase)) {
      const allowedCommands = getAllowedCommands(message);
      await message.reply(
        allowedCommands
          ? `You do not have permission to run "${commandBase} ...". You may only use: ${allowedCommands}`
          : 'You do not have permission to run any commands.'
      );
      return;
    }

    // Write the admin name into the broadcast command when prependAdminNameInBroadcast is enabled.
    if (options.prependAdminNameInBroadcast) {
      command = command.replace(
        /^AdminBroadcast /i,
        `AdminBroadcast ${message.member?.displayName ?? 'Unknown Admin'}: `
      );
    }

    // Execute command and print response.
    // We haven't check that the command is valid, let the server tell you, advantage of this,
    // If that SquadTS can be outdated, but the Squad server will never be.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await respondToMessage(message, await server.rcon.execute(command as any));
  }

  async function respondToMessage(
    message: OmitPartialGroupDMChannel<Message<boolean>>,
    response: string
  ) {
    for (const splitResponse of splitLongResponse(response)) {
      await message.channel.send(`\`\`\`${splitResponse}\`\`\``);
    }
  }

  connectors.discord.on('messageCreate', onDiscordMessage.bind(onDiscordMessage));

  return async () => {
    connectors.discord.removeListener('messageCreate', onDiscordMessage.bind(onDiscordMessage));
  };
};

function splitLongResponse(response: string) {
  const responseMessages = [''];

  for (const line of response.split('\n')) {
    if (responseMessages[responseMessages.length - 1].length + line.length > 1994) {
      responseMessages.push(line);
    } else {
      responseMessages[responseMessages.length - 1] = `${
        responseMessages[responseMessages.length - 1]
      }\n${line}`;
    }
  }

  return responseMessages;
}

export default discordSquadRcon;

export const requireConnectors = ['discord'];
