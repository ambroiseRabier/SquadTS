import { expect, it } from '@jest/globals';
import { extractAdmins } from './extract-admins';


it('should extract admins', () => {
  const input = `
Admin=76561197999700001:Whitelist // NameA
Admin=76561198448100002:Modo // NameB
Admin=76561197996300003:SuperAdmin // NameC
Admin=76561198814900004:Admin // NameD
Admin=76561199682700005:TeamTWS // NameE
Admin=76561198002200006:Whitelist // Duplicate
Admin=76561198002200006:Whitelist // Duplicate
`;
  expect(Object.fromEntries(extractAdmins(input))).toEqual({
    "76561197996300003": "SuperAdmin",
    "76561197999700001": "Whitelist",
    "76561198002200006": "Whitelist",
    "76561198448100002": "Modo",
    "76561198814900004": "Admin",
    "76561199682700005": "TeamTWS"
  });
});
