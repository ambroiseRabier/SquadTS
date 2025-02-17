/** All possible IDs that a player can have. */
export const playerIdNames = ['steamID', 'eosID'] as const;

/**
 * For parsing `Online IDs:` body.
 */
const ID_MATCHER = /\s*(?<platform>[^\s:]+)\s*:\s*(?<id>[^\s]+)/g;

/**
 * Returns {steamID: string, eosID: string}
 */
export function extractIDs(idsStr: string): Record<(typeof playerIdNames)[number], string> {
  return Object.fromEntries(
    Array.from(idsStr.matchAll(ID_MATCHER)).map(match => {
      const { platform, id } = match.groups ?? {};
      const formattedPlatform = lowerPlatform(platform); // Lowercase without prefix
      return [formattedPlatform, id];
    })
  ) as any;
}

/**
 * Generates lowercase ID names. Examples:
 *   steam -> steamID
 *   EOSID -> eosID
 */
const lowerPlatform = (str: string) => {
  return str.toLowerCase() + 'ID';
};
