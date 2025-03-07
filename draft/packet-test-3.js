
const asciiString = String.fromCharCode(
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00
);
// Follow response, that is always sent after a mirror, type is also mirrored on Squad servers.
const follow = encodePacket(
  0x00, //PacketType.RESPONSE_VALUE,
  0, // packet.id
  asciiString
);
// write the wrong value of 10, when it actually is 17, following UE4 RCON.
follow.writeInt32LE(10, 0);

function encodePacket(type, id, body) {
  // Size, in bytes, of the whole packet.
  // 14 => size = 4, id = 4, type = 4, string terminator = 2
  const size = Buffer.byteLength(body) + 14;
  const buffer = Buffer.alloc(size);
  // size should not count itself. Doc:
  // "Note that the packet size field itself is not included when determining the size of the packet, so the value of this field is always 4 less than the packet's actual length"
  buffer.writeInt32LE(size - 4, 0);
  buffer.writeInt32LE(id, 4);
  buffer.writeInt32LE(type, 8);
  buffer.write(body, 12, size - 2, 'ascii'); // todo maybe SquadTS support utf8 ?
  // String terminator and 8 empty bits
  buffer.writeInt16LE(0, size - 2);
  return buffer;
}


/**
 * Output: "0a 14 1e 28" ...
 */
function bufToHexString(buf) {
  // Same result as buf.toString("hex").match(/../g).join(" ")
  return [...buf].map(byte => byte.toString(16).padStart(2, '0')).join(' ');
}

function decodePacket(packet) {
  const size = packet.readUInt32LE(0); // Size of the packet
  const id = packet.readUInt32LE(4); // Packet identifier
  const type = packet.readUInt32LE(8); // Type of the packet

  // Check if there's a string terminator starting at byte 12
  const isStringTerminator = packet.readInt16LE(12) === 0;

  // Decode the body of the packet (if there's no string terminator)
  const body = isStringTerminator ? '' : packet.toString('utf8', 12, packet.byteLength - 2);

  // Return the decoded packet
  return {
    size,
    id,
    type,
    body,
  };
}

console.log(bufToHexString(follow));
console.log(decodePacket(follow));
const empty = encodePacket(
  0x00, //PacketType.RESPONSE_VALUE,
  1, // packet.id
  '' // empty
);
console.log(bufToHexString(empty));
console.log(decodePacket(empty));

/*
When I check for 00 01, squadJS checks for 00 00 00 01 00 00 00, but in the body as string.
Maybe converting to a string

$ node draft/packet-test-3.js
0a 00 00 00 00 00 00 00 00 00 00 00 00 00 00 01 00 00 00 00 00
{ size: 10, id: 0, type: 0, body: '' }
0a 00 00 00 01 00 00 00 00 00 00 00 00 00
{ size: 10, id: 1, type: 0, body: '' }
*/
