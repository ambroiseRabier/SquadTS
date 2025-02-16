import { it, expect } from 'vitest';
import { extractGroupPermissions } from './extract-group-permissions';


it('should extract permissions', () => {
  const input = `
Group=TeamTWS:reserve,canseeadminchat,balance,teamchange
Group=Admin:balance,ban,cameraman,canseeadminchat,changemap,chat,teamchange,startvote,reserve,immune,kick,forceteamchange
Group=SuperAdmin:teamchange,startvote,reserve,private,pause,manageserver,kick,immune,forceteamchange,featuretest,demos,debug,config,clientdemos,cheat,chat,changemap,canseeadminchat,cameraman,ban,balance
Group=Modo:changemap,canseeadminchat,ban,teamchange,reserve,kick,forceteamchange,clientdemos,demos,chat
Group=Whitelist:reserve
`;
  expect(Object.fromEntries(extractGroupPermissions(input))).toEqual({
    "Admin": [
      "balance",
      "ban",
      "cameraman",
      "canseeadminchat",
      "changemap",
      "chat",
      "teamchange",
      "startvote",
      "reserve",
      "immune",
      "kick",
      "forceteamchange"
    ],
    "Modo": [
      "changemap",
      "canseeadminchat",
      "ban",
      "teamchange",
      "reserve",
      "kick",
      "forceteamchange",
      "clientdemos",
      "demos",
      "chat"
    ],
    "SuperAdmin": [
      "teamchange",
      "startvote",
      "reserve",
      "private",
      "pause",
      "manageserver",
      "kick",
      "immune",
      "forceteamchange",
      "featuretest",
      "demos",
      "debug",
      "config",
      "clientdemos",
      "cheat",
      "chat",
      "changemap",
      "canseeadminchat",
      "cameraman",
      "ban",
      "balance"
    ],
    "TeamTWS": [
      "reserve",
      "canseeadminchat",
      "balance",
      "teamchange"
    ],
    "Whitelist": [
      "reserve"
    ]
  });
});
