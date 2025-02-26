import { Player, Squad } from './use-cached-game-status';
import { RconSquad } from '../rcon-squad/use-rcon-squad';
import { usePlayerGet } from './use-player-get';

interface Props {
  players: () => Player[];
  squads: () => Squad[];
  serverInfo: () => Awaited<ReturnType<RconSquad['showServerInfo']>>;
}

/**
 * Squad lead helper type.
 */
export type PlayerSL = Player & {
  squad: NonNullable<Squad>;
  squadIndex: NonNullable<Player['squadIndex']>;
} & { isLeader: true };

/**
 * Convenience method that will adjust Player type when isLeader is true.
 * @param player
 */
export function isSL(player: Player): player is PlayerSL {
  return player.isLeader;
}

/**
 * Unassigned helper type.
 */
export type UnassignedPlayer = Omit<Player, 'squadIndex' | 'squad'>;

/**
 * Convenience method that will adjust Player type when they are unassigned.
 * @param player
 */
export function isUnassigned(player: Player): player is UnassignedPlayer {
  return !!player.squadIndex; // or squad, both are updated at the same time.
}

export function useHelpers(p: Props) {
  const playerGet = usePlayerGet(p.players);
  const { getPlayerByEOSID } = playerGet;

  function getSquad(teamID: string, squadIndex: string) {
    // Guard against plugin dev mistakes
    if (!squadIndex) {
      throw new Error('Provided squadIndex is nullish');
    }
    // Guard against plugin dev mistakes
    if (!teamID) {
      throw new Error('Provided teamID is nullish');
    }

    return p.squads().find(
      // We need to check both id, because each team can have a squad one for example.
      squad => squad.teamID === teamID && squad.squadIndex === squadIndex
    );
  }

  function getPlayersInSquad(teamID: string, squadIndex: string) {
    // Guard against plugin dev mistakes
    if (!squadIndex) {
      throw new Error('Provided squadIndex is nullish');
    }
    // Guard against plugin dev mistakes
    if (!teamID) {
      throw new Error('Provided teamID is nullish');
    }

    return p
      .players()
      .filter(player => player.squadIndex === squadIndex && player.teamID === teamID);
  }

  function getPlayerSquad(eosID: string) {
    // Guard against plugin dev mistakes
    if (!eosID) {
      throw new Error('Provided eosID is nullish');
    }
    const player = getPlayerByEOSID(eosID);
    if (player === undefined || !player.squadIndex) {
      return undefined;
    } else {
      return getSquad(player.teamID, player.squadIndex);
    }
  }

  function getTeamName(teamID: '1' | '2') {
    return teamID === '1' ? p.serverInfo().teamOne : p.serverInfo().teamTwo;
  }

  /**
   * nameWithClanTag is obtained through RCON, almost always set.
   * name is obtained through logs when the player connect, if the player
   * is already connected when SquadTS starts, it won't be set.
   * Default to "Unknown" if not found (this should actually never happen...)
   */
  function getPlayerDisplayName(player: Player) {
    return player.nameWithClanTag ?? player.name ?? 'Unknown';
  }

  return {
    isSL,
    isUnassigned,
    getSquad,
    getPlayerSquad,
    getPlayersInSquad,
    getTeamName,
    getPlayerDisplayName,
    ...playerGet,
  };
}
