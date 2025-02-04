/**
 * Any rule added also needs events in use-log-parser.ts to be updated.
 *
 * Notes: haven't seen any logs for team leader change or joining a squad (that you are not creating)
 */
export const logParserRules = [
  ["adminBroadcast", "^LogSquad: ADMIN COMMAND: Message broadcasted <(?<message>.+)> from (?<from>.+)"],

  // todo: instigator becomes playerSuffix ?
  ["deployableDamaged", "^LogSquadTrace: \\[DedicatedServer](?:ASQDeployable::)?TakeDamage\\(\\): (?<deployable>[A-z0-9_]+)_C_[0-9]+: (?<damage>[0-9.]+) damage attempt by causer (?<weapon>[A-z0-9_]+)_C_[0-9]+ instigator (?<playerSuffix>.+) with damage type (?<damageType>[A-z0-9_]+)_C health remaining (?<healthRemaining>[0-9.]+)"],

  // todo: mapClassname definitely not supposed to be a string for consumer plugins
  // todo: what is the 6th group ?
  ["newGame", "^LogWorld: Bringing World \\/(?<dlc>[A-z]+)\\/(?:Maps\\/)?(?<mapClassname>[A-z0-9-]+)\\/(?:.+\\/)?(?<layerClassname>[A-z0-9-]+)(?:\\.[A-z0-9-]+)"],

  // Called before playerConnected and playerJoinSucceeded
  ["loginRequest", "^LogNet: Login request: \\?Name=(?<name>.*) userId: RedpointEOS:(?<eosID>0002a10386d9114496bf20d22d3860ba) platform: RedpointEOS"],

  // Called right before join succeeded and player initialize it seems
  // Yes, there is two spaces after Player, probably a mistake from Squad devs.
  ["playerAddedToTeam", "^LogSquad: Player  (?<name>.+) has been added to Team (?<teamID>[0-9]+)"],

  // Called between loginRequest and playerJoinSucceeded
  ["playerConnected", "^LogSquad: PostLogin: NewPlayer: BP_PlayerController_C .+PersistentLevel\\.(?<controller>[^\\s]+) \\(IP: (?<ip>[\\d.]+) \\| Online IDs:(?<ids>[^)|]+)\\)"],

  // todo: Player Controller ID usage compared to playerDied is confusing
  ["playerDamaged", "^LogSquad: Player:(?<victimNameWithClanTag>.+) ActualDamage=(?<damage>[0-9.]+) from (?<attackerNameWithClanTag>.+) \\(Online IDs:(?<attackerIDs>[^|]+)\\| Player Controller ID: (?<attackerController>[^ ]+)\\)caused by (?<weapon>[A-z_0-9-]+)_C"],

  // todo: is Contoller ID a mistake on SquadJS or OWI ?
  ["playerDied", "^LogSquadTrace: \\[DedicatedServer](?:ASQSoldier::)?Die\\(\\): Player:(?<victimNameWithClanTag>.+) KillingDamage=(?:-)*(?<damage>[0-9.]+) from (?<attackerController>[A-z_0-9]+) \\(Online IDs:(?<attackerIDs>[^)|]+)\\| Contoller ID: ([\\w\\d]+)\\) caused by (?<weapon>[A-z_0-9-]+)_C"],

  ["playerDisconnected", "^LogNet: UChannel::Close: Sending CloseBunch\\. ChIndex == [0-9]+\\. Name: \\[UChannel\\] ChIndex: [0-9]+, Closing: [0-9]+ \\[UNetConnection\\] RemoteAddr: (?<ip>[\\d.]+):[\\d]+, Name: EOSIpNetConnection_[0-9]+, Driver: GameNetDriver EOSNetDriver_[0-9]+, IsServer: YES, PC: (?<playerController>[^ ]+PlayerController_C_[0-9]+), Owner: [^ ]+PlayerController_C_[0-9]+, UniqueId: RedpointEOS:(?<eosID>[\\d\\w]+)"],

  // Called at start of each game it seems, and right before playerAddedToTeam
  ["playerInitialized", "^LogGameMode: Initialized player (?<name>.+) with (?<id>[0-9]+)"],

  // todo: Ok so this one is strange, in SquadJS, it get transform into playerConnected
  // seems like it want to track player that try to join but fail ?
  // Called after loginRequest and playerConnected
  ["playerJoinSucceeded", "^LogNet: Join succeeded: (?<name>.+)"],
  ["playerPossess", "^LogSquadTrace: \\[DedicatedServer](?:ASQPlayerController::)?OnPossess\\(\\): PC=(?<playerSuffix>.+) \\(Online IDs:(?<ids>[^)]+)\\) Pawn=(?<possessClassname>[A-z0-9_]+)_C"],

  // todo: Interesting case where there two set of ids
  ["playerRevived", "^LogSquad: (?<reviverNameWithClanTag>.+) \\(Online IDs:(?<reviverIDs>[^)]+)\\) has revived (?<revivedNameWithClanTag>.+) \\(Online IDs:(?<revivedIDs>[^)]+)\\)\\."],

  ["playerUnPossess", "^LogSquadTrace: \\[DedicatedServer](?:ASQPlayerController::)?OnUnPossess\\(\\): PC=(?<name>.+) \\(Online IDs:(?<ids>[^)]+)\\)"],

  // ControllerID is duplicated in logs here.
  ["playerWounded", "^LogSquadTrace: \\[DedicatedServer](?:ASQSoldier::)?Wound\\(\\): Player:(?<victimNameWithClanTag>.+) KillingDamage=(?:-)*(?<damage>[0-9.]+) from (?<attackerController>[A-z_0-9]+) \\(Online IDs:(?<attackerIDs>[^)|]+)\\| Controller ID: ([\\w\\d]+)\\) caused by (?<weapon>[A-z_0-9-]+)_C"],

  ["roundEnded", "^LogGameState: Match State Changed from InProgress to WaitingPostMatch"],

  // todo: rename from subfaction to subFaction
  ["roundTicket", "^LogSquadGameEvents: Display: Team (?<team>[0-9]), (?<subFaction>.*) \\( ?(?<faction>.*?) ?\\) has (?<action>won|lost) the match with (?<tickets>[0-9]+) Tickets on layer (?<layer>.*) \\(level (?<level>.*)\\)!"],

  // todo this might be a special case when server endmatch forcefully ?
  // The issue is with Squad here, it says both teams won, see for yourself:
  // [2025.01.27-22.27.36:080][206]LogSquadTrace: [DedicatedServer]ASQGameMode::DetermineMatchWinner(): 1st Cavalry Regiment won on Kamdesh Highlands
  // [2025.01.27-22.27.36:080][206]LogSquadTrace: [DedicatedServer]ASQGameMode::DetermineMatchWinner(): 78th Detached Logistics Brigade won on Kamdesh Highlands
  // ["roundWinner", "^LogSquadTrace: \\[DedicatedServer](?:ASQGameMode::)?DetermineMatchWinner\\(\\): (?<winner>.+) won on (?<layer>.+)"],
  ["serverTickRate", "^LogSquad: USQGameState: Server Tick Rate: (?<tickRate>[0-9.]+)"],
] as const;


export type LogParserRules = typeof logParserRules;
