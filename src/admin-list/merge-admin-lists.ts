import { AdminPerms } from './permissions';

// Note: hopefully, duplicated groups have no impact, and only compiled permissions of
// admins are kept before admin lists are combined by squad server...
//
// From https://squad.fandom.com/wiki/Server_Configuration#RemoteAdminListHosts.cfg
// "If a player is listed in multiple files, their permissions will be combined."
export function mergeAdminLists(lists: Map<string, AdminPerms[]>[]): Map<string, AdminPerms[]> {
  const combined = new Map<string, AdminPerms[]>();

  for (const list of lists) {
    for (const [steamID, perms] of list) {
      const existingPerms = combined.get(steamID) || [];
      combined.set(steamID, [...new Set([...existingPerms, ...perms])]);
    }
  }

  return combined;
}
