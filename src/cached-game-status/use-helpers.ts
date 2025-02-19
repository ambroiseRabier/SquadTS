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
  squadID: NonNullable<Player['squadID']>;
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
export type UnassignedPlayer = Omit<Player, 'squadID' | 'squad'>;

/**
 * Convenience method that will adjust Player type when they are unassigned.
 * @param player
 */
export function isUnassigned(player: Player): player is UnassignedPlayer {
  return !!player.squadID; // or squad, both are updated at the same time.
}


export function useHelpers(p: Props) {
  const playerGet = usePlayerGet(p.players);
  const {
    getPlayerByEOSID,
  } = playerGet;

  function getSquad(teamID: string, squadID: string) {
    // Guard against plugin dev mistakes
    if (!squadID) {
      throw new Error('Provided squadID is nullish');
    }
    // Guard against plugin dev mistakes
    if (!teamID) {
      throw new Error('Provided teamID is nullish');
    }

    return p.squads().find(
      // We need to check both id, because each team can have a squad one for example.
      squad => squad.teamID === teamID && squad.squadID === squadID
    );
  }

  function getPlayersInSquad(teamID: string, squadID: string) {
    // Guard against plugin dev mistakes
    if (!squadID) {
      throw new Error('Provided squadID is nullish');
    }
    // Guard against plugin dev mistakes
    if (!teamID) {
      throw new Error('Provided teamID is nullish');
    }

    return p.players()
      .filter(player => player.squadID === squadID && player.teamID === teamID);
  }

  function getPlayerSquad(eosID: string) {
    // Guard against plugin dev mistakes
    if (!eosID) {
      throw new Error('Provided eosID is nullish');
    }
    const player = getPlayerByEOSID(eosID);
    if (player === undefined || !player.squadID) {
      return undefined;
    } else {
      return getSquad(player.teamID, player.squadID);
    }
  }

  function getTeamName(teamID: '1' | '2') {
    return teamID === '1'
      ? p.serverInfo().teamOne
      : p.serverInfo().teamTwo;
  }

  return {
    isSL,
    isUnassigned,
    getSquad,
    getPlayerSquad,
    getPlayersInSquad,
    getTeamName,
    ...playerGet,
  }

}
