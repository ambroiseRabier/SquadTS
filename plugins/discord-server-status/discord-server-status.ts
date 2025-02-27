import { SquadTSPlugin } from '../../src/plugin-loader/plugin.interface';
import { Message, OmitPartialGroupDMChannel } from 'discord.js';
import { DiscordServerStatusOptions } from './discord-server-status.config';
import { generateMessage } from './src/generate-message';

const discordServerStatus: SquadTSPlugin<DiscordServerStatusOptions> = async (
  server,
  connectors,
  logger,
  options
) => {
  // function updateStatus() {
  //   if (options.setBotStatus) {
  //     connectors.discord.user?.setActivity(
  //       `(${server.info.a2sPlayerCount}/${server.info.publicSlots}) ${server.info.currentLayer ?? 'Unknown'}`,
  //       { type: 4 }
  //     );
  //   }
  // }

  async function onDiscordMessage(message: OmitPartialGroupDMChannel<Message<boolean>>) {
    // Parse the incoming message.
    const commandMatch = message.content.match(
      new RegExp(`^${options.command}(?: (subscribe)| (unsubscribe) ([0-9]+) ([0-9]+))?$`, 'i')
    );

    // Stop processing the message if it does not match the command.
    if (!commandMatch) {
      return;
    }

    // Split message parts.
    const [subscribe, unsubscribe /*, channelID, messageID*/] = commandMatch.slice(1);

    // Handle non subscription messages.
    if (subscribe === undefined && unsubscribe === undefined) {
      logger.info('Generating message content...');
      const generatedMessage = generateMessage(server);

      logger.info('Sending non-subscription message...');
      await message.channel.send(generatedMessage);
      logger.info('Sent non-subscription message.');

      return;
    }

    // Handle subscription message.
    // if (subscribe !== undefined) {
    //   if (options.disableSubscriptions) {
    //     await message.reply('automated updates is disabled.');
    //     return;
    //   }
    //
    //   logger.info('Generating message content...');
    //   const generatedMessage = generateMessage(server);
    //
    //   logger.info('Sending subscription message...');
    //   const newMessage = await message.channel.send(generatedMessage);
    //   logger.info('Sent subscription message.');
    //
    //   // Subscribe the message for automated updates.
    //   const newChannelID = newMessage.channel.id;
    //   const newMessageID = newMessage.id;
    //
    //   logger.info(`Subscribing message (Channel ID: ${newChannelID}, Message ID: ${newMessageID}) to automated updates...`);
    //   // await this.SubscribedMessage.create({
    //   //   channelID: newChannelID,
    //   //   messageID: newMessageID,
    //   //   server: this.server.id
    //   // });
    //   logger.info(`Subscribed message (Channel ID: ${newChannelID}, Message ID: ${newMessageID}) to automated updates.`);
    //
    //   return;
    // }
    //
    // // Handle unsubscription messages.
    // if (unsubscribe !== undefined) {
    //   logger.info(`Unsubscribing message (Channel ID: ${channelID}, Message ID: ${messageID}) from automated updates...`);
    //   // await this.SubscribedMessage.destroy({
    //   //   where: {
    //   //     channelID: channelID,
    //   //     messageID: messageID,
    //   //     server: this.server.id
    //   //   }
    //   // });
    //   logger.info(`Unsubscribed message (Channel ID: ${channelID}, Message ID: ${messageID}) from automated updates.`);
    //
    //   logger.info('Sending acknowledgement message...');
    //   await message.reply('unsubscribed message from automated updates.');
    //   logger.info('Sent acknowledgement message.');
    // }
  }

  // Not 100% sure I need the bind here.
  connectors.discord.on('messageCreate', onDiscordMessage.bind(onDiscordMessage));

  // interval(options.updateFrequency * 1000)
  //   .pipe(
  //     exhaustMap(async () => {
  //     })
  //   )
  //   .subscribe();

  return async () => {
    connectors.discord.removeListener('messageCreate', onDiscordMessage.bind(onDiscordMessage));
  };
};

export default discordServerStatus;
