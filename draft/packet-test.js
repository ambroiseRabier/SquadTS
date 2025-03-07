// Gen by IA partially careful of comments.
// This is wrong and give wrong result. Assuming I need to remove more than 2 bytes
// So 5 extra bytes to remove until data is correct?
const rawPacket = Buffer.from([
  /*0x00,*/ /*0x00,*/ /*0x00,*/ /*0x00,*/ // Size
  /*0x00,*/ 0x7c,
  0x00,
  0x00, // Id
  0x00,
  0x02,
  0x00,
  0x00, // Type
  0x00,
  0x00,
  0x00,
  0x00, // String Terminator
  0x2d,
  0x2d,
  0x2d,
  0x2d, // Body starts here
  0x2d,
  0x20,
  0x41,
  0x63,
  0x74,
  0x69,
  0x76,
  0x65,
  0x20,
  0x53,
  0x71,
  0x75,
  0x61,
  0x64,
  0x73,
  0x20,
  0x2d,
  0x2d,
  0x2d,
  0x2d,
  0x2d,
  0x0a,
  0x54,
  0x65,
  0x61,
  0x6d,
  0x20,
  0x49,
  0x44,
  0x3a,
  0x20,
  0x31,
  0x20,
  0x28,
  0x31,
  0x73,
  0x74,
  0x20,
  0x42,
  0x61,
  0x74,
  0x74,
  0x61,
  0x6c,
  0x69,
  0x6f,
  0x6e,
  0x2c,
  0x20,
  0x4c,
  0x65,
  0x67,
  0x69,
  0x6f,
  0x6e,
  0x20,
  0x6f,
  0x66,
  0x20,
  0x42,
  0x61,
  0x62,
  0x79,
  0x6c,
  0x6f,
  0x6e,
  0x29,
  0x0a,
  0x54,
  0x65,
  0x61,
  0x6d,
  0x20,
  0x49,
  0x44,
  0x3a,
  0x20,
  0x32,
  0x20,
  0x28,
  0x4d,
  0x61,
  0x6e,
  0x74,
  0x69,
  0x63,
  0x6f,
  0x72,
  0x65,
  0x20,
  0x53,
  0x65,
  0x63,
  0x75,
  0x72,
  0x69,
  0x74,
  0x79,
  0x20,
  0x54,
  0x61,
  0x73,
  0x6b,
  0x20,
  0x46,
  0x6f,
  0x72,
  0x63,
  0x65,
  0x29,
  0x00,
  0x00,
]);

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

console.log(decodePacket(rawPacket)); // correct id/size/body when removing extra 5 bytes, totalling 7 bytes
