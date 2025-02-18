export interface GameServerInfo {
  // e.g. 100
  MaxPlayers: number;

  // e.g. "Seed"
  GameMode_s: string;

  // e.g. "Sumari_Seed_v1"
  MapName_s: string;

  // e.g. "[fr]tws-invasiononly,sumariseedv1,seed"
  SEARCHKEYWORDS_s: string;

  // e.g. "v8.2.1.369429.845"
  GameVersion_s: string;

  // e.g. true
  LICENSEDSERVER_b: boolean;

  // e.g. "56336"
  PLAYTIME_I: string;

  // e.g. "7"
  Flags_I: string;

  // e.g. "TeamDeathmatch"
  MATCHHOPPER_s: string;

  // e.g. 120
  MatchTimeout_d: number;

  // e.g. "GameSession"
  SESSIONTEMPLATENAME_s: string;

  // e.g. false
  Password_b: boolean;

  // e.g. "1"
  PlayerCount_I: string;

  // e.g. "[FR] TWS - INVASION ONLY"
  ServerName_s: string;

  // e.g. "1000812"
  LicenseId_s: string;

  // e.g. "OU50yaTav800q/EZewTAtXucSWtJx3xoizlbJaGYxTtKbjlqQrUS3WFqc..."
  LicenseSig1_s: string;

  // e.g. "svZIf6iTwpopHQ63Z5nU7pf6YOYZK4143jZPdL0va+mjXE..."
  LicenseSig2_s: string;

  // e.g. "34z41qQdN8sey0q+A+CLpSdqjiGJDX4+2fWS+trG07Cxf/R..."
  LicenseSig3_s: string;

  // e.g. ";1;64;"
  TagLanguage_s: string;

  // e.g. "003;009;015;021;027;033;..."
  'TagGameMode-0_s': string;

  // e.g. "001;007;013;019;025;..."
  'TagGameMode-1_s': string;

  // e.g. "005;011;017;023;..."
  'TagGameMode-2_s': string;

  // e.g. ";1;"
  TagGameMode_s: string;

  // e.g. ";2;"
  TagPlaystyle_s: string;

  // e.g. ";1;"
  TagMapRotation_s: string;

  // e.g. ";1;"
  TagExperience_s: string;

  // e.g. ";1;4;8;16;32;64;"
  TagRules_s: string;

  // e.g. "0"
  CurrentModLoadedCount_I: string;

  // e.g. false
  AllModsWhitelisted_b: boolean;

  // e.g. "WPMC_S_CombinedArms_Seed"
  TeamTwo_s: string;

  // e.g. "19"
  'eu-central-1_I': string;

  // e.g. "40"
  'eu-north-1_I': string;

  // e.g. "26"
  'eu-west-2_I': string;

  // e.g. "90"
  'me-central-1_I': string;

  // e.g. "75"
  'us-east-1_I': string;

  // e.g. "137"
  'us-west-1_I': string;

  // e.g. "267"
  'ap-southeast-2_I': string;

  // e.g. "260"
  'ap-east-1_I': string;

  // e.g. "35"
  'ap-southeast-1_I': string;

  // e.g. "eu-central-1"
  Region_s: string;

  // e.g. "Sumari Bala Seed v1"
  NextLayer_s: string;

  // e.g. "INS_S_CombinedArms_Seed"
  TeamOne_s: string;

  // e.g. "0"
  PlayerReserveCount_I: string;

  // e.g. "20"
  PublicQueueLimit_I: string;

  // e.g. "0"
  PublicQueue_I: string;

  // e.g. "0"
  ReservedQueue_I: string;

  // e.g. "15003"
  BeaconPort_I: string;
};

export const gameServerInfoKeys: (keyof GameServerInfo)[] = [
  'MaxPlayers',
  'GameMode_s',
  'MapName_s',
  'SEARCHKEYWORDS_s',
  'GameVersion_s',
  'LICENSEDSERVER_b',
  'PLAYTIME_I',
  'Flags_I',
  'MATCHHOPPER_s',
  'MatchTimeout_d',
  'SESSIONTEMPLATENAME_s',
  'Password_b',
  'PlayerCount_I',
  'ServerName_s',
  'LicenseId_s',
  'LicenseSig1_s',
  'LicenseSig2_s',
  'LicenseSig3_s',
  'TagLanguage_s',
  'TagGameMode-0_s',
  'TagGameMode-1_s',
  'TagGameMode-2_s',
  'TagGameMode_s',
  'TagPlaystyle_s',
  'TagMapRotation_s',
  'TagExperience_s',
  'TagRules_s',
  'CurrentModLoadedCount_I',
  'AllModsWhitelisted_b',
  'TeamTwo_s',
  'eu-central-1_I',
  'eu-north-1_I',
  'eu-west-2_I',
  'me-central-1_I',
  'us-east-1_I',
  'us-west-1_I',
  'ap-southeast-2_I',
  'ap-east-1_I',
  'ap-southeast-1_I',
  'Region_s',
  'NextLayer_s',
  'TeamOne_s',
  'PlayerReserveCount_I',
  'PublicQueueLimit_I',
  'PublicQueue_I',
  'ReservedQueue_I',
  'BeaconPort_I',
];
