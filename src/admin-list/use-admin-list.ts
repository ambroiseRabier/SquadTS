import { Logger } from 'pino';
import { AdminListConfig } from './use-admin-list.schema';
import { extractGroupPermissions } from './extract-group-permissions';
import { extractAdmins } from './extract-admins';


export function useAdminList(logger: Logger, options: AdminListConfig) {
  let admins: Map<string, string[]> = new Map();

  return {
    admins,
    fetch: async () => {
      logger.info('Fetching admin list...');

      let text: string;

      for (let url of options.remote) {
        try {
          logger.info(`Fetching ${url}`);

          const response = await fetch(url);

          if (!response.ok) {
            logger.error(`HTTP error! Status: ${response.status} ${response.statusText}`);
            continue;
          }

          text = await response.text();

          logger.debug(`Received:\n${text}`);

          if (!text || text.length === 0) {
            logger.error(`Received admin.cfg is empty!`);
            continue;
          }
        } catch (error: any) {
          logger.error(`Failed to fetch ${url}. Error: ${error?.message}`, error);
          continue;
        }

        const parsed = parseAdminCFG(text, logger);

        if (!parsed) {
          continue;
        }

        for (let [key, value] of admins) {
          if (parsed.has(key)) {
            logger.warn(`${key} is already in admin list. Overriding with new permissions.`)
          }
        }

        // Merge
        for (let [key, value] of parsed) {
          admins.set(key, value);
        }
        logger.info(`Admin list fetched. ${admins.size} admins found.`);
      }

      return admins;
    }
  }
}


function parseAdminCFG(adminCFG: string, logger: Logger) {
  const groupToPermissions = extractGroupPermissions(adminCFG);

  if (groupToPermissions.size === 0) {
    logger.error('Failed to parse admin.cfg! No groups found.');
    return null;
  }

  const adminsToGroup = extractAdmins(adminCFG);

  if (adminsToGroup.size === 0) {
    logger.error('Failed to parse admin.cfg! No admins found.');
    return null;
  }

  const adminPermissionsMap = new Map<string, string[]>();

  for (const [adminID, groupID] of adminsToGroup.entries()) {
    // Look up permissions for their groupID
    // Default to empty array if not found
    const permissions = groupToPermissions.get(groupID) || [];
    adminPermissionsMap.set(adminID, permissions);
  }

  return adminPermissionsMap;
}
