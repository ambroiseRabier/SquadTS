

/** All possible IDs that a player can have. */
export const playerIdNames = ['steamID', 'eosID'] as const;

/**
 * For parsing `Online IDs:` body.
 */
const ID_MATCHER = /\s*(?<platform>[^\s:]+)\s*:\s*(?<id>[^\s]+)/g;


/**
 * Returns {steamID: string, eosID: string} without prefix
 * With prefix "creator" it will return {creatorSteamID: string, creatorEosID: string}
 */
export function extractIDs<T extends string | undefined>(
  idsStr: string,
  prefix?: T
): T extends string
  ? Record<`${T}${Capitalize<typeof playerIdNames[number]>}`, string>
  : Record<`${typeof playerIdNames[number]}ID`, string> {
  return Object.fromEntries(
    Array.from(idsStr.matchAll(ID_MATCHER)).map((match) => {
      const { platform, id } = match.groups ?? {};
      const formattedPlatform = prefix
        ? prefix + capitalPlatform(platform) // Capitalized with prefix
        : lowerPlatform(platform); // Lowercase without prefix
      return [formattedPlatform, id];
    })
  ) as any;
}

/**
 * Generates capitalized ID names. Examples:
 *   steam -> SteamID
 *   EOSID -> EOSID
 */
const capitalPlatform = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1) + 'ID';
};

/**
 * Generates lowercase ID names. Examples:
 *   steam -> steamID
 *   EOSID -> eosID
 */
const lowerPlatform = (str: string) => {
  return str.toLowerCase() + 'ID';
};

