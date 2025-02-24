/**
 * Based on https://squad.fandom.com/wiki/Server_Configuration#Admins.cfg
 */
export enum AdminPerms {
  /**
   * Not used currently
   */
  StartVote = 'startvote',

  /**
   * Switch to another map on the server
   */
  ChangeMap = 'changemap',

  /**
   * Pause server gameplay
   */
  Pause = 'pause',

  /**
   * Use server cheat commands
   */
  Cheat = 'cheat',

  /**
   * Password protect the server
   */
  Private = 'private',

  /**
   * Group ignores server team balance rules
   */
  Balance = 'balance',

  /**
   * Kick a player from the server
   */
  Kick = 'kick',

  /**
   * Ban a player from the server
   */
  Ban = 'ban',

  /**
   * Change server configuration settings
   */
  Config = 'config',

  /**
   * Admin spectate mode (cameraman functionality)
   */
  Cameraman = 'cameraman',

  /**
   * Cannot be kicked or banned from the server
   */
  Immune = 'immune',

  /**
   * Shutdown or manage the server
   */
  ManageServer = 'manageserver',

  /**
   * Access to features added for developer testing
   */
  FeatureTest = 'featuretest',

  /**
   * Reserve slot on the server
   */
  Reserve = 'reserve',

  /**
   * Record demos ("demos" permission combined with "demo" and "ClientDemos" enables functionality)
   */
  Demos = 'demos',

  /**
   * Record demos
   */
  Demo = 'demo',

  /**
   * Record demos for clients
   */
  ClientDemos = 'ClientDemos',

  /**
   * Show admin stats and other debugging info
   */
  Debug = 'debug',

  /**
   * No timer limits on team changes
   */
  TeamChange = 'teamchange',

  /**
   * Permission to force team changes with a command
   */
  ForceTeamChange = 'forceteamchange',

  /**
   * Can see admin chat and teamkill/admin-join notifications
   */
  CanSeeAdminChat = 'canseeadminchat',
}

export type AdminPermsValues = AdminPerms[keyof AdminPerms];

// Note: I feel like mixing string enum with his value, is somewhat smelly.
