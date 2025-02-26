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
 * Note: Force extending PluginBaseOptions, however, there is no need for a plugin to know they have enabled to true
 * and to know logger verbosity through options. Logger verbosity can still be obtained through the logger itself.
 */
export type SquadTSPlugin<PluginOptions extends PluginBaseOptions> = (
  server: SquadServer,
  connectors: { discord: DiscordConnector },
  logger: Logger,
  options: Omit<PluginOptions, 'enabled' | 'loggerVerbosity'>
  // In this case, it is valid.
) => Promise<EmptyOrCleanup>; // may or may not have a cleanup function
