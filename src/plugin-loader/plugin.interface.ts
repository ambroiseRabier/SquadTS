import { SquadServer } from '../squad-server';

export type Plugin<PluginOptions> = (server: SquadServer, options: PluginOptions) => void;
