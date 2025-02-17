const adminRgx =
  /(?<=^Admin=)(?<adminID>\d{17}|[a-f0-9]{32}):(?<groupID>\S+)/gm;

export function extractAdmins(data: string) {
  const admins = new Map<string, string>(); // Create a Map to store adminID -> groupID
  let match;

  while ((match = adminRgx.exec(data)) !== null) {
    const adminID = match.groups?.adminID || '';
    const groupID = match.groups?.groupID || '';
    admins.set(adminID, groupID); // Store as key-value pairs
  }

  return admins;
}
