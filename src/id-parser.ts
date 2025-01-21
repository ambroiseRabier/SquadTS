

/** All possible IDs that a player can have. */
export const playerIdNames = ['steamID', 'eosID'] as const;

/**
 * For parsing `Online IDs:` body.
 */
const ID_MATCHER = /\s*(?<platform>[^\s:]+)\s*:\s*(?<id>[^\s]+)/g;

export function extractIDsLower(str: string) {
  return extractIDs(str, false) as {steamID: string, eosID: string};
}

export function extractIDsUpper(str: string) {
  return extractIDs(str, true) as {SteamID: string, EOSID: string};
}

function extractIDs(idsStr: string, upper: boolean) {
  return Object.fromEntries(
    Array.from(idsStr.matchAll(ID_MATCHER)).map((match) => {
      const { platform, id } = match.groups ?? {};
      const formattedPlatform = upper
        ? capitalPlatform(platform)
        : lowerPlatform(platform);
      return [formattedPlatform, id];
    })
  );
}

// FORMATTING

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

