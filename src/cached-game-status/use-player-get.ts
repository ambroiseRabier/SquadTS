import { Player } from './use-cached-game-status';


export function usePlayerGet(getPlayers: () => Player[]) {

  /**
   * Try to get player from name, if there is none or more than one result, it will return undefined.
   *
   * Why ?
   * RCON only gives names with clan tag, and connected logs only name without clan tag.
   * Depending on each update interval, we may not have both available when calling this function.
   *
   * How ?
   * 1. search for name
   * 2. search for nameWithClanTag with name (a no clan player will match)
   * 3. search for a unique match in nameWithClanTag
   */
  function tryGetPlayerByName(name: string) {
    // Guard against plugin dev mistakes
    if (!name) {
      throw new Error('Provided name is nullish');
    }

    const playersByName = getPlayersByName(name);

    // Easy case where we only have one match
    if (playersByName.length === 1) {
      return playersByName[0];
    }

    // Haven't found the player ? Maybe the logs are late, try matching name on nameWithClanTag
    const playersByNameWithClanTag = getPlayersByNameWithClanTag(name);

    // Player with no clan tag
    if (playersByNameWithClanTag.length === 1) {
      return playersByNameWithClanTag[0];
    }

    // Still haven't found the player ? Maybe we can search clan tags with partial match
    const partialMatch = getPlayers().filter(player =>
      // If for whatever reason nameWithClanTag is undefined, filter out player.
      !!player.nameWithClanTag?.match(new RegExp(`${name}$`))
    );

    // unique nameWithClanTag containing name
    if (partialMatch.length === 1) {
      return partialMatch[0];
    }

    return undefined;
  }


  /**
   * Try to get player from nameWithClanTag, if there is none or more than one result, it will return undefined.
   *
   * Why ?
   * RCON only gives names with clan tag, and connected logs only name without clan tag.
   * Depending on each update interval, we may not have both available when calling this function.
   *
   * How ?
   * 1. search for nameWithClanTag
   * 2. search from name with nameWithClanTag (a no clan player will match)
   * 3. no search for a partially matching name, as this is unreliable
   */
  function tryGetPlayerByNameWithClanTag(nameWithClanTag: string) {
    // Guard against plugin dev mistakes
    if (!nameWithClanTag) {
      throw new Error('Provided nameWithClanTag is nullish');
    }

    const playersByNameWithClanTag = getPlayersByNameWithClanTag(nameWithClanTag);

    // Easy case where we only have one match
    if (playersByNameWithClanTag.length === 1) {
      return playersByNameWithClanTag[0];
    }

    // Haven't found the player ? Maybe the RCON is late, try matching name on name
    const playersByName = getPlayersByName(nameWithClanTag);

    // Player with no clan tag
    if (playersByName.length === 1) {
      return playersByName[0];
    }

    // No partial match here
    return undefined;
  }

  /**
   * A given name may match more than one player. You may want to use tryGetPlayerByName.
   */
  function getPlayersByName(name: string) {
    // Guard against plugin dev mistakes
    if (!name) {
      throw new Error('Provided name is nullish');
    }

    return getPlayers().filter(player => player.name === name);
  }

  function getPlayersByNameWithClanTag(nameWithClanTag: string) {
    // Guard against plugin dev mistakes
    if (!nameWithClanTag) {
      throw new Error('Provided nameWithClanTag is nullish');
    }
    return getPlayers().filter(player => player.nameWithClanTag === nameWithClanTag);
  }

  function getPlayerByEOSID(eosID: string) {
    // Guard against plugin dev mistakes
    if (!eosID) {
      throw new Error('Provided eosID is nullish');
    }
    return getPlayers().find(player => player.eosID === eosID);
  }

  return {
    tryGetPlayerByName,
    tryGetPlayerByNameWithClanTag,
    getPlayersByName,
    getPlayersByNameWithClanTag,
    getPlayerByEOSID,
  };
}
