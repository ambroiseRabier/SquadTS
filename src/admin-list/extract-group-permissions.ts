const groupRgx =
  /(?<=^Group=)(?<groupID>.*?):(?<groupPerms>.*?)(?=(?:\r\n|\r|\n|\s+\/\/))/gm;

export function extractGroupPermissions(adminCFG: string) {
  const map = new Map<string, string[]>();
  let match: RegExpExecArray | null;

  while ((match = groupRgx.exec(adminCFG)) !== null) {
    const groupID = match.groups?.groupID || '';
    const groupPerms = match.groups?.groupPerms || '';
    const permsArray = groupPerms.split(',');
    map.set(groupID, permsArray);
  }

  return map;
}
