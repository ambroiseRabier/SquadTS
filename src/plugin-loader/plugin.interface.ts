import { SquadServer } from '../squad-server';
import { PluginBaseOptions } from './plugin-base.config';
import { Logger } from 'pino';
import { DiscordConnector } from '../connectors/use-discord.connector';

// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
type EmptyOrCleanup = void | (() => Promise<void>);

/**
 * Base type main function of each plugin should extend.
 * Return is an optional cleanup function.
 *
 * Note: Force config to extend PluginBaseOptions.
 */
export type SquadTSPlugin<PluginOptions extends PluginBaseOptions> = (
  server: SquadServer,
  connectors: { discord: DiscordConnector },
  logger: Logger,
  options: PluginOptions, // Note that enabled will always be true.
) => Promise<EmptyOrCleanup>; // may or may not have a cleanup function
