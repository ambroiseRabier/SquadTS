/**
 * Any rule added also needs events in use-log-parser.ts to be updated.
 */
export const logParserRules = [
  ["adminBroadcast", "^LogSquad: ADMIN COMMAND: Message broadcasted <(?<message>.+)> from (?<from>.+)"],

  // todo: instigator becomes playerSuffix ?
  ["deployableDamaged", "^LogSquadTrace: \\[DedicatedServer](?:ASQDeployable::)?TakeDamage\\(\\): (?<deployable>[A-z0-9_]+)_C_[0-9]+: (?<damage>[0-9.]+) damage attempt by causer (?<weapon>[A-z0-9_]+)_C_[0-9]+ instigator (?<playerSuffix>.+) with damage type (?<damageType>[A-z0-9_]+)_C health remaining (?<healthRemaining>[0-9.]+)"],

  // todo: mapClassname definitely not supposed to be a string for consumer plugins
  // todo: what is the 6th group ?
  ["newGame", "^LogWorld: Bringing World \\/(?<dlc>[A-z]+)\\/(?:Maps\\/)?(?<mapClassname>[A-z0-9-]+)\\/(?:.+\\/)?(?<layerClassname>[A-z0-9-]+)(?:\\.[A-z0-9-]+)"],

  // todo ids, is special case
  ["playerConnected", "^LogSquad: PostLogin: NewPlayer: BP_PlayerController_C .+PersistentLevel\\.(?<playerController>[^\\s]+) \\(?<ip>IP: ([\\d.]+) \\| Online IDs:(?<ids>[^)|]+)\\)"],

  // todo: Player Controller ID usage compared to playerDied is confusing
  ["playerDamaged", "^LogSquad: Player:(?<victimName>.+) ActualDamage=(?<damage>[0-9.]+) from (?<attackerName>.+) \\(?<ids>Online IDs:([^|]+)\\| Player Controller ID: (?<attackerController>[^ ]+)\\)caused by (?<weapon>[A-z_0-9-]+)_C"],

  // todo: is Contoller ID a mistake on SquadJS or OWI ?
  ["playerDied", "^LogSquadTrace: \\[DedicatedServer](?:ASQSoldier::)?Die\\(\\): Player:(?<victimName>.+) KillingDamage=(?:-)*(?<damage>[0-9.]+) from (?<attackerPlayerController>[A-z_0-9]+) \\(Online IDs:(?<ids>[^)|]+)\\| Contoller ID: ([\\w\\d]+)\\) caused by (?<weapon>[A-z_0-9-]+)_C"],

  ["playerDisconnected", "^LogNet: UChannel::Close: Sending CloseBunch\\. ChIndex == [0-9]+\\. Name: \\[UChannel\\] ChIndex: [0-9]+, Closing: [0-9]+ \\[UNetConnection\\] RemoteAddr: (?<ip>[\\d.]+):[\\d]+, Name: EOSIpNetConnection_[0-9]+, Driver: GameNetDriver EOSNetDriver_[0-9]+, IsServer: YES, PC: (?<playerController>[^ ]+PlayerController_C_[0-9]+), Owner: [^ ]+PlayerController_C_[0-9]+, UniqueId: RedpointEOS:(?<eosID>[\\d\\w]+)"],

  // todo: Ok so this one is strange, in SquadJS, it get transform into playerConnected
  // seems like it want to track player that try to join but fail ?
  ["playerJoinSucceeded", "^LogNet: Join succeeded: (?<playerSuffix>.+)"],
  ["playerPossess", "^LogSquadTrace: \\[DedicatedServer](?:ASQPlayerController::)?OnPossess\\(\\): PC=(?<playerSuffix>.+) \\(Online IDs:(?<ids>[^)]+)\\) Pawn=(?<possessClassname>[A-z0-9_]+)_C"],

  // todo: Interesting case where there two set of ids
  ["playerRevived", "^LogSquad: (?<reviverName>.+) \\(Online IDs:(?<reviverIDs>[^)]+)\\) has revived (.+) \\(?<victimIDs>Online IDs:([^)]+)\\)\\."],

  ["playerUnPossess", "^LogSquadTrace: \\[DedicatedServer](?:ASQPlayerController::)?OnUnPossess\\(\\): PC=(?<playerSuffix>.+) \\(Online IDs:(?<ids>[^)]+)\\)"],

  // todo: unclear who's IDs is who's player
  ["playerWounded", "^LogSquadTrace: \\[DedicatedServer](?:ASQSoldier::)?Wound\\(\\): Player:(?<victimName>.+) KillingDamage=(?:-)*(?<damage>[0-9.]+) from (?<attackerPlayerController>[A-z_0-9]+) \\(?<attackerIDs>Online IDs:([^)|]+)\\| Controller ID: (?<controllerIDs>[\\w\\d]+)\\) caused by (?<weapon>[A-z_0-9-]+)_C"],

  ["roundEnded", "^LogGameState: Match State Changed from InProgress to WaitingPostMatch"],

  // todo: rename from subfaction to subFaction
  ["roundTicket", "^LogSquadGameEvents: Display: Team (?<team>[0-9]), (?<subFaction>.*) \\( ?(?<faction>.*?) ?\\) has (?<action>won|lost) the match with (?<tickets>[0-9]+) Tickets on layer (?<layer>.*) \\(level (?<level>.*)\\)!"],

  ["roundWinner", "^LogSquadTrace: \\[DedicatedServer](?:ASQGameMode::)?DetermineMatchWinner\\(\\): (?<winner>.+) won on (?<layer>.+)"],
  ["serverTickRate", "^LogSquad: USQGameState: Server Tick Rate: (?<tickRate>[0-9.]+)"],
] as const;


export type LogParserRules = typeof logParserRules;
