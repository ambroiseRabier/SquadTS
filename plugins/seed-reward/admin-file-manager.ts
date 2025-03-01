import { Logger } from 'pino';
import { format } from 'date-fns';

const SEED_REWARD_GROUP = 'SeedRewardPlugin';

const ensureGroup = (lines: string[]): string[] => {
  const hasGroup = lines.some(line => line.trim().startsWith(`Group=${SEED_REWARD_GROUP}:`));

  if (!hasGroup) {
    // Find the last Group definition
    const lastGroupIndex = lines.reduce((lastIndex, line, index) => {
      return line.trim().startsWith('Group=') ? index : lastIndex;
    }, -1);

    const groupLine = `Group=${SEED_REWARD_GROUP}:reserve // Auto-generated group for seed rewards`;

    if (lastGroupIndex === -1) {
      // No groups found, add at start
      lines.unshift(groupLine);
    } else {
      // Insert after last group
      lines.splice(lastGroupIndex + 1, 0, groupLine);
    }
  }

  return lines;
};

export function useAdminFileManager(
  adminsFetch: () => Promise<string>,
  adminsUpload: (adminsFile: string) => Promise<void>,
  logger: Logger
) {
  const updateOrAddWhitelist = async (
    steamID: string,
    nameWithClanTag: string,
    expiryDate: Date
  ) => {
    const adminsCfg = await adminsFetch();
    let lines = adminsCfg.split('\n');

    lines = ensureGroup(lines);

    const expiryStr = format(expiryDate, 'dd MMM yyyy');
    let whitelistUpdated = false;

    // Update existing whitelist if found
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(`Admin=${steamID}:${SEED_REWARD_GROUP}`)) {
        whitelistUpdated = true;
        lines[i] =
          `Admin=${steamID}:${SEED_REWARD_GROUP} // Seed reward for ${nameWithClanTag} (expires ${expiryStr})`;
      }
    }

    // Add new whitelist if none existed
    if (!whitelistUpdated) {
      // Keep final blank line if there is one
      if (lines[lines.length - 1] === '') {
        lines.splice(
          lines.length - 1,
          0,
          `Admin=${steamID}:${SEED_REWARD_GROUP} // Seed reward for ${nameWithClanTag} (expires ${expiryStr})`
        );
      } else {
        lines.push(
          `Admin=${steamID}:${SEED_REWARD_GROUP} // Seed reward for ${nameWithClanTag} (expires ${expiryStr})`
        );
      }
    }

    logger.info(
      whitelistUpdated
        ? `Updating whitelist expiry for ${steamID} to ${expiryStr}`
        : `Adding new whitelist for ${steamID} expiring ${expiryStr}`
    );

    await adminsUpload(lines.join('\n'));
  };

  const removeWhitelists = async (steamIDs: string[]) => {
    if (steamIDs.length === 0) {
      throw new Error('No steamIDs provided');
    }

    const adminsCfg = await adminsFetch();
    const lines = adminsCfg.split('\n');

    // Keep lines that don't match any of the steamIDs we want to remove
    const updatedLines = lines.filter(
      line => !steamIDs.some(steamID => line.includes(`Admin=${steamID}:${SEED_REWARD_GROUP}`))
    );

    await adminsUpload(updatedLines.join('\n'));
  };

  return {
    updateOrAddWhitelist,
    removeWhitelists,
  };
}
