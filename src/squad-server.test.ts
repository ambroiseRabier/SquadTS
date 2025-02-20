import { SquadServer } from './squad-server';
import { it } from 'vitest';

// This test is a bit special.
// We are just making sure fields are available to plugins developer.
// TS should not transpile if there is anything wrong, but once TS is fixed this test should always pass.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function toBeNeverCalled(server: SquadServer) {
  // noinspection JSUnusedLocalSymbols
  server.chatEvents.message.subscribe(() => {
    /* no-op */
  });
  server.helpers.getPlayerByEOSID('');
  await server.rcon.getListPlayers();
  await server.rcon.broadcast('hello');

  server.events.adminBroadcast.subscribe(broad => {
    broad.message.charAt(0); // is string...
  });

  server.players.forEach(() => {
    /* no-op */
  });
  console.log(server.info.teamOne);
}

it('return a well defined API', () => {
  // no-op
});
