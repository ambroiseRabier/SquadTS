export type IncludesRCONCommand<T extends string> =
  T extends `${string}${RCONCommand}${string}` ? T : never;

// To generate:
// 1. npx tsx scripts/rcon-execute.ts ListCommands 1 > tmp/commands.txt
// 2. Clean out logs from file.
// 3. Ask IA to make enum.

/**
 * In case there is a command that is non-listed, you may circumvent typing restriction until
 * this is updated.
 */
export enum RCONCommand {
  /** Prints out the information for all commands in the game. */
  ListCommands = 'ListCommands',

  /** Prints out the details of a particular command. */
  ShowCommandInfo = 'ShowCommandInfo',

  /** Prints out the information for all commands the player is currently permitted to execute. */
  ListPermittedCommands = 'ListPermittedCommands',

  /** Get information about the current configuration and state of the server. */
  ShowServerInfo = 'ShowServerInfo',

  /** Tells the server to stop execution. */
  AdminKillServer = 'AdminKillServer',

  /** Set the maximum number of players for this server. */
  AdminSetMaxNumPlayers = 'AdminSetMaxNumPlayers',

  /** Set the number of reserved player slots. */
  AdminSetNumReservedSlots = 'AdminSetNumReservedSlots',

  /** Set the password for a server or use "" to remove it. */
  AdminSetServerPassword = 'AdminSetServerPassword',

  /** Set the clock speed on the server 0.1 is 10% of normal speed 2.0 is twice the normal speed. */
  AdminSlomo = 'AdminSlomo',

  /** Set the limit of the public queue size. */
  AdminSetPublicQueueLimit = 'AdminSetPublicQueueLimit',

  /** Set the target player count for seeding. Bots will be used to fill the server up to this player count. Teams will be balanced so that both teams have an equal number of players+bots. */
  AdminSetSeedTargetPlayerCount = 'AdminSetSeedTargetPlayerCount',

  /** List player ids with associated player name and SteamId. */
  ListPlayers = 'ListPlayers',

  /** List Squads by their Index numbers's. */
  ListSquads = 'ListSquads',

  /** List recently disconnected player ids with associated player name and SteamId. */
  AdminListDisconnectedPlayers = 'AdminListDisconnectedPlayers',

  /** Teleports you to a given player on the server. */
  AdminTeleportToPlayer = 'AdminTeleportToPlayer',

  /** Teleports you to a given player on the server by ID. */
  AdminTeleportToPlayerById = 'AdminTeleportToPlayerById',

  /** Kicks a player from the server. */
  AdminKick = 'AdminKick',

  /** Kicks a player with Id from the server. */
  AdminKickById = 'AdminKickById',

  /** Bans a player from the server for a length of time. 0 = Perm, 1d = 1 Day, 1M = 1 Month, etc. */
  AdminBan = 'AdminBan',

  /** Bans a player with Id from the server for a length of time. 0 = Perm, 1d = 1 Day, 1M = 1 Month, etc. */
  AdminBanById = 'AdminBanById',

  /** Warns a player from the server for being abusive. */
  AdminWarn = 'AdminWarn',

  /** Warns a player with Id from the server for being abusive. */
  AdminWarnById = 'AdminWarnById',

  /** Changes a player's team. */
  AdminForceTeamChange = 'AdminForceTeamChange',

  /** Changes a player with a certain id's team. */
  AdminForceTeamChangeById = 'AdminForceTeamChangeById',

  /** Remove a player from their squad without kicking them via Id. */
  AdminRemovePlayerFromSquadById = 'AdminRemovePlayerFromSquadById',

  /** Remove a player from their squad without kicking them. */
  AdminRemovePlayerFromSquad = 'AdminRemovePlayerFromSquad',

  /** Demote a commander specified by player name or EOS Id. */
  AdminDemoteCommander = 'AdminDemoteCommander',

  /** Demote a commander with Id from the server. */
  AdminDemoteCommanderById = 'AdminDemoteCommanderById',

  /** Disbands the specified Squad. */
  AdminDisbandSquad = 'AdminDisbandSquad',

  /** Renames the specified Squad. */
  AdminRenameSquad = 'AdminRenameSquad',

  /** Invite a member to your squad, the name can be partial. */
  SLInviteMember = 'SLInviteMember',

  /** Prints out the list of available levels. */
  ListLevels = 'ListLevels',

  /** Prints out the list of available layers. */
  ListLayers = 'ListLayers',

  /** Change the level (and pick a random layer on it) and travel to it immediately. */
  AdminChangeLevel = 'AdminChangeLevel',

  /** Change the layer and travel to it immediately. */
  AdminChangeLayer = 'AdminChangeLayer',

  /** Set the next Level (and pick a random layer on it) to travel to after this match ends. */
  AdminSetNextLevel = 'AdminSetNextLevel',

  /** Set the next layer to travel to after this match ends. */
  AdminSetNextLayer = 'AdminSetNextLayer',

  /** Clear selection of next layer (only in voting mode). */
  AdminClearNextLayer = 'AdminClearNextLayer',

  /** Reloads server config. */
  AdminReloadServerConfig = 'AdminReloadServerConfig',

  /** Ask the server what the current level & layer are. */
  ShowCurrentMap = 'ShowCurrentMap',

  /** Ask the server what the next level & layer are. */
  ShowNextMap = 'ShowNextMap',

  /** Switch between voting and layer rotation mode. */
  AdminEnableVoting = 'AdminEnableVoting',

  /** Send system message to all players on the server. */
  AdminBroadcast = 'AdminBroadcast',

  /** Send system message to all admins on the server. */
  ChatToAdmin = 'ChatToAdmin',

  /** Trigger a vote on given question and choices. */
  AdminVote = 'AdminVote',

  /** Tell the server to restart the match. */
  AdminRestartMatch = 'AdminRestartMatch',

  /** Tell the server to immediately end the match. */
  AdminEndMatch = 'AdminEndMatch',

  /** Tell the server to put the match on hold. */
  AdminPauseMatch = 'AdminPauseMatch',

  /** Tell the server to take off the hold. */
  AdminUnpauseMatch = 'AdminUnpauseMatch',

  /** Sets the fog of war active in the match. */
  AdminSetFogOfWar = 'AdminSetFogOfWar',

  /** Force all vehicle availability. */
  AdminForceAllVehicleAvailability = 'AdminForceAllVehicleAvailability',

  /** Force all deployables availability. */
  AdminForceAllDeployableAvailability = 'AdminForceAllDeployableAvailability',

  /** Force all roles availability. */
  AdminForceAllRoleAvailability = 'AdminForceAllRoleAvailability',

  /** Force all actions availability. */
  AdminForceAllActionAvailability = 'AdminForceAllActionAvailability',

  /** Disable Team change timer. */
  AdminNoTeamChangeTimer = 'AdminNoTeamChangeTimer',

  /** Disable respawn timer. */
  AdminNoRespawnTimer = 'AdminNoRespawnTimer',

  /** Sets the server to disable vehicle claiming. */
  AdminDisableVehicleClaiming = 'AdminDisableVehicleClaiming',

  /** Sets the server to disable vehicle Team Requirement. */
  AdminDisableVehicleTeamRequirement = 'AdminDisableVehicleTeamRequirement',

  /** Sets the server to disable vehicle Kit Requirement. */
  AdminDisableVehicleKitRequirement = 'AdminDisableVehicleKitRequirement',

  /** Sets the server to ignore placement rules for deployables. */
  AdminAlwaysValidPlacement = 'AdminAlwaysValidPlacement',

  /** If true, when a connection becomes saturated, all remaining actors that couldn't complete replication will have ForceNetUpdate called on them. */
  AdminForceNetUpdateOnClientSaturation = 'AdminForceNetUpdateOnClientSaturation',

  /** Add a player to the camera man list. */
  AdminAddCameraman = 'AdminAddCameraman',

  /** Create a Vehicle for testing. */
  AdminCreateVehicle = 'AdminCreateVehicle',

  /** Create a Deployable for testing. */
  AdminCreateDeployable = 'AdminCreateDeployable',

  /** Create an inventory item for testing. */
  AdminGiveEquipment = 'AdminGiveEquipment',

  /** Create an Actor for testing. */
  AdminSpawnActor = 'AdminSpawnActor',

  /** Plays back the demo recording, must have file from server. */
  AdminDemoPlay = 'AdminDemoPlay',

  /** Records gameplay on the server into a demo file, which can be opened on a client. Also use the AdminDemoStop command to stop the replay. */
  AdminDemoRec = 'AdminDemoRec',

  /** Stops recording and saves the demo to disk. */
  AdminDemoStop = 'AdminDemoStop',

  /** Starts profiling on the server for a fixed length of time, after which the profiling data is saved to disk. */
  AdminProfileServer = 'AdminProfileServer',

  /** Runs a lightweight CSV profile. Results will be stored in memory until stopped, so be wary of long profiles. */
  AdminProfileServerCSV = 'AdminProfileServerCSV',

  /** Prints all vehicles in the level. */
  DebugVehicleList = 'DebugVehicleList',

  /** Sets a specific component health. Use DebugVehicleInterrogateComponents to figure out which component has what index. */
  DebugVehicleSetComponentHealthByName = 'DebugVehicleSetComponentHealthByName',

  /** Prints the current server's custom options to the console. */
  DebugPrintCustomOptions = 'DebugPrintCustomOptions',

  /** Set a server custom option. */
  AdminSetCustomOption = 'AdminSetCustomOption',

  /** Remove a server custom option. */
  AdminRemoveCustomOption = 'AdminRemoveCustomOption',

  /** Adds X amount of build supply to the nearest friendly FOB. */
  DebugAddBuildSupply = 'DebugAddBuildSupply',

  /** Adds X amount of ammo supply to the nearest friendly FOB. */
  DebugAddAmmoSupply = 'DebugAddAmmoSupply',

  /** Rearm all weapons. */
  DebugRearm = 'DebugRearm',

  /** Rearm all weapons for a specific player. */
  DebugRearmPlayer = 'DebugRearmPlayer',

  /** Prints all stats of selected player. */
  DebugPrintPlayerStats = 'DebugPrintPlayerStats',

  /** Prints number of vehicles for all the possible factions in the current level. */
  DebugFactionVehicleCount = 'DebugFactionVehicleCount',

  /** Prints all possible combinations of factions. */
  DebugPrintFactionsList = 'DebugPrintFactionsList',

  /** Set next layer to next possible option. */
  MoveToNextFactionVariant = 'MoveToNextFactionVariant',

  /** Lists all skins that exist. */
  SQSkinsListAllSkins = 'SQ.Skins.ListAllSkins',

  /** Lists all skins that have been replicated back to our client for the current faction. */
  SQSkinsListReplicatedEquippedSkins = 'SQ.Skins.ListReplicatedEquippedSkins',

  /** Lists all skins currently equipped for all factions from our game settings. */
  SQSkinsListAllEquippedSkins = 'SQ.Skins.ListAllEquippedSkins',

  /** Clears all equipped skins. */
  SQSkinsClearEquippedSkins = 'SQ.Skins.ClearEquippedSkins',

  /** Toggles a specific skin on/off. */
  SQSkinsToggleSkin = 'SQ.Skins.ToggleSkin',

  /** Sets allowing all skins to function without checking requirements or not. */
  SQSkinsForceAllowAll = 'SQ.Skins.ForceAllowAll',

  /** Start recording a dated replay locally. */
  RecordingStart = 'RecordingStart',

  /** Start recording a named replay locally. */
  RecordingStart_Named = 'RecordingStart_Named',

  /** Stop recording local replay. */
  RecordingStop = 'RecordingStop',

  /** Print out debug information about the loading screen. */
  DebugLoadingScreen = 'DebugLoadingScreen',

  /** Changes the target KBytes/Sec for the RepGraph's Dynamic Spatial Frequency node. */
  RepGraphSetDSFTargetKBytesSec = 'RepGraphSetDSFTargetKBytesSec',
}
