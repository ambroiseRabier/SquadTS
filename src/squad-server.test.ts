import { SquadServer } from './squad-server';

// This test is a bit special.
// We are just making sure fields are available to plugins developer.
// TS should not transpile if there is anything wrong, but once TS is fixed this test should always pass.
// noinspection JSUnusedLocalSymbols
async function toBeNeverCalled(server: SquadServer) {
  server.chatEvents.message.subscribe((message) => {});
  server.helpers.getPlayerByEOSID('');
  await server.rcon.getListPlayers();
  await server.rcon.broadcast('hello');

  server.events.adminBroadcast.subscribe((broad) => {
    broad.message.charAt(0); // is string...
  });
}
