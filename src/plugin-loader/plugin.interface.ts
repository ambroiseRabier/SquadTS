import { SquadServer } from '../squad-server';
import { PluginBaseOptions } from './plugin-base.config';
import { Logger } from 'pino';
import { DiscordConnector } from '../connectors/use-discord.connector';

/**
 * Base type main function of each plugin should extend.
 *
 * Force extending PluginBaseOptions, however, there is no need for a plugin to know they have enabled to true
 * and to know logger verbosity through options. Logger verbosity can still be obtained through the logger itself.
 */
export type SquadTSPlugin<PluginOptions extends PluginBaseOptions> = (
  server: SquadServer,
  connectors: { discord: DiscordConnector },
  logger: Logger,
  options: Omit<PluginOptions, 'enabled' | 'loggerVerbosity'>
) => Promise<void>;
