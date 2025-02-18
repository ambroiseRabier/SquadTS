/**
 * For parsing `Online IDs:` body.
 */
const ID_MATCHER = /\s*(?<platform>[^\s:]+)\s*:\s*(?<id>[^\s]+)/g;

/**
 * Returns {steamID: string, eosID: string}
 */
export function extractIDs(idsStr: string) {
  const match = Array.from(idsStr.matchAll(ID_MATCHER));
  const steamId = match.find(match => match.groups?.platform?.toLowerCase() === 'steam')?.groups?.id;
  const eosID = match.find(match => match.groups?.platform?.toLowerCase() === 'eos')?.groups?.id;

  // Not supposed to happen, right?
  if (!steamId || !eosID) {
    throw new Error('No steamID or eosID match found for string: ' + idsStr + '.');
  }

  return {
    steamID: steamId,
    eosID: eosID,
  };
}
