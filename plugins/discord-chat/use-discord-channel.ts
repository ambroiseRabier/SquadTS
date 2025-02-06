import { Client } from 'discord.js';

// SquadTS notes: Does not seem required by either Discord or Boost license. Leaving it here until further confirmation.
/* As set out by the terms of the license, the following should not be modified. */
const COPYRIGHT_MESSAGE = `Powered by SquadTS, Copyright © ${new Date().getFullYear()}`;

/**
 * This for text channel only.
 * Use logger.error to catch any error coming from this.
 * @param discordClient
 * @param channelID
 */
export async function useDiscordChannel(discordClient: Client, channelID: string) {
  const channel = await discordClient.channels.fetch(channelID).then(channel => {
    if (!channel) {
      throw new Error(`Could not fetch Discord channel with channelID "${channelID}". Are you sure the channelID is correct?`);
    }
    return channel;
  }).catch(error => {
    throw new Error(`Could not fetch Discord channel with channelID "${channelID}". Error: ${error?.message}`);
  });

  if (!channel.isSendable()) {
    throw new Error(`Invalid channel type, it should be text based, type for channelID "${channelID}" is ${channel.type}`)
  }

  return channel;
}
