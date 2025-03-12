/**
 * npx tsx scripts/debug-decode-packet.ts 18 00 00 00 01 00 03 00 02 00 00 00 53 68 6f 77 43 75 72 72 65 6e 74 4d 61 70 00 00
 * 18 00 00 00 01 00 03 00 02 00 00 00 53 68 6f 77 43 75 72 72 65 6e 74 4d 61 70 00 00
 *
 * What SquadTS sees:
 * { size: 24, id: 196609, type: 2, body: 'ShowCurrentMap' }
 *
 * What SquadJS sees:
 * { size: 24, id: 1, count: 3, type: 2, body: 'ShowCurrentMap' }
 */

import { decodePacket } from '../src/rcon/packet';

// no need to join into a single string. Avoid us splitting later.
let bytesStr = process.argv.slice(2);

// You may also hardcode the string if it is too long for comand line.
// bytesStr = `0a 00 00 00 02 00 01 00 02 00 00 00 00 00 00 01 00 00 00 00 00`.split(' ');

console.log(`\nBytes length: ${bytesStr.length}`);

function decodePacketSquadJS(packet: Buffer) {
  return {
    size: packet.readUInt32LE(0),
    id: packet.readUInt8(4),
    count: packet.readUInt16LE(6),
    type: packet.readUInt32LE(8),
    body: packet.toString('utf8', 12, packet.byteLength - 2),
  };
}

const byteArray = (hexString: string[]) => Buffer.from(hexString
  .map(byte => parseInt(byte, 16))); // Convert each hex string to a number (byte)

console.log('\nWhat SquadTS sees:');
console.log(decodePacket(byteArray(bytesStr)));

console.log('\nWhat SquadJS sees:');
console.log(decodePacketSquadJS(byteArray(bytesStr)));
