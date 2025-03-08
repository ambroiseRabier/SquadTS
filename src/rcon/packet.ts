import * as util from 'node:util';

export const MAXIMUM_PACKET_RESPONSE_SIZE = 4096;

/**
 * https://developer.valvesoftware.com/wiki/Source_RCON_Protocol
 * @param type The packet type field is a 32-bit little endian integer, which indicates the purpose of the packet. Its value will always be either 0, 2, or 3.
 * @param id The packet id field is a 32-bit little endian integer chosen by the client for each request. It may be set to any positive integer. When the server responds to the request, the response packet will have the same packet id as the original request (unless it is a failed SERVERDATA_AUTH_RESPONSE packet - see below.) It need not be unique, but if a unique packet id is assigned, it can be used to match incoming responses to their corresponding requests.
 * @param body The packet body field is a null-terminated string encoded in ASCII
 */
export function encodePacket(type: PacketType, id: number, body: string) {
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
 * Doc: https://developer.valvesoftware.com/wiki/Source_RCON_Protocol
 */
export enum PacketType {
  EXEC_COMMAND = 0x02,
  // This is by design, not a mistake.
  // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
  AUTH_RESPONSE = 0x02,
  RESPONSE_VALUE = 0x00,
  AUTH = 0x03,
  /**
   * Special packet type from Squad, undocumented.
   */
  CHAT_VALUE = 0x01,
}

export interface Packet {
  size: number;
  id: number;
  type: PacketType;
  body: string;
  isFollowResponse: boolean;
}

function isValidPacketType(type: number): type is PacketType {
  return Object.values(PacketType).includes(type);
}

export function debugDecodePacket(buffer: Buffer) {
  const size = buffer.length >= 4 && buffer.readUInt32LE(0);
  const id = buffer.length >= 8 && buffer.readUInt32LE(4);
  const type = buffer.length >= 12 && buffer.readUInt32LE(8);
  const body = buffer.length >= 12 && buffer.toString('utf8', 12, buffer.byteLength - 2);
  return (
    `Incoming packet: ${util.inspect({ size, id, type, body }, false, null, true)}\n` +
    'Raw packet: ' +
    bufToHexString(buffer)
  );
}

/**
 * Decode a packet.
 * Note: decodePacket is not able to determine is this is a follow response.
 *       check use-packer-data-handler for extra (verbose) info.
 */
export function decodePacket(packet: Buffer): Omit<Packet, 'isFollowResponse'> {
  const size = packet.readUInt32LE(0);
  const id = packet.readUInt32LE(4);
  const type = packet.readUInt32LE(8);

  // Multi-packet responses end marker:
  // Doc "Rather than throwing out the erroneous request, SRCDS mirrors it back to the client"
  // But (Node stuff here) "The `toString('utf8')` method will decode all bytes in the specified range,
  // even if they are null bytes or non-printable characters.
  // It doesn’t treat `0x00` as a string terminator like null-terminated C strings."
  const isStringTerminator = packet.readInt16LE(12) === 0;

  // Doc "followed by another RESPONSE_VALUE packet containing 0x0000 0001 0000 0000 in the packet body field."
  // Also known as "0a 00 00 00 01 00 00 00 00 00 00 00 00 00 00 01 00 00 00 00 00"
  // const isFollowResponse = packet.length >= 16 && packet.readInt32LE(12) === 16777216;

  // Decoding a string terminator will result in garbage data with a string length of 12,
  // when we are expecting an empty string !
  // decoding as utf8 is compatible with ascii, not sure if we receive only ascii.
  const body = isStringTerminator ? '' : packet.toString('utf8', 12, packet.byteLength - 2);

  // May happen on a Squad update, if a new packet type is added.
  if (!isValidPacketType(type)) {
    throw new Error(`Invalid/Unknown packet type: ${type}, with body: ${body}`);
  }

  return {
    size,
    id,
    type,
    body,
  };
}

/**
 * Output: "0a 14 1e 28" ...
 */
export function bufToHexString(buf: Buffer<ArrayBuffer>) {
  // Same result as buf.toString("hex").match(/../g).join(" ")
  return [...buf].map(byte => byte.toString(16).padStart(2, '0')).join(' ');
}
