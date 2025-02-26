// import { AdminPerms } from './admin-list/permissions';
// import { Player, Squad } from './cached-game-status/use-cached-game-status';
// import { PlayerSL, UnassignedPlayer } from './cached-game-status/use-helpers';
// import { SquadTSPlugin } from './plugin-loader/plugin.interface';
// import { SquadServer } from './squad-server';
//
// export { Player, Squad, PlayerSL, UnassignedPlayer, SquadTSPlugin, SquadServer, AdminPerms };
// Seems like it breaks plugin :/ (switch plugin, likely when multiples files ?)
// (maybe we need to import all ts file in the plugin folder, not just the main file ?)

export default function noop() {
  /*noop*/
}
