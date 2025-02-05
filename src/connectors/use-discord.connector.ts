import { Client, GatewayIntentBits, Events } from "discord.js";
import { Logger } from 'pino';

export async function useDiscordConnector(discordToken: string, logger: Logger) {
  logger.info('Connecting to Discord...');
  const connector = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers
    ]
  });
  connector.once(Events.ClientReady, (readyClient) => {
    logger.info(`Discord connector ready! Logged in as ${readyClient.user.tag}`);
  });
  await connector.login(discordToken);
  // setup compatability with older plugins for message create event.
  connector.on('messageCreate', (message) => {
    connector.emit('message', message);
  });

  return connector;
}

export type DiscordConnector = Awaited<ReturnType<typeof useDiscordConnector>>;
