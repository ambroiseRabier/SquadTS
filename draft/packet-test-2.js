
export function encodePacket(type, id, body) {
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

console.log(encodePacket(1, 1, '').length); // 14 is min size
