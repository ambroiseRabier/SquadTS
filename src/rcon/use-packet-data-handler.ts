import { Logger } from 'pino';
import { PacketType } from './use-rcon';

/**
 * Handle raw data, transform it into a Packet.
 * Calls onPacketCallback when finished decoding.
 */
export function usePacketDataHandler(
  logger: Logger,
  onPacketCallback: (packet: Packet) => void,
) {
  const incomingChunks: Buffer[] = [];
  let chunksByteLength = 0;
  let actualPacketLength: number | undefined;
  let packetType: PacketType | undefined;
  let packetId: number | undefined;

  function cleanUp() {
    incomingChunks.length = 0; // clear array, keep reference
    chunksByteLength = 0;
    actualPacketLength = undefined;
    packetType = undefined;
    packetId = undefined;
  }

  function onData(data: Buffer<ArrayBufferLike>) {
    // Note: auth request will not come back with password, so we won't display the password here.
    logger.trace(`Got data: ${bufToHexString(data)}`);

    // function logTracePacket() {
    //
    // }

    chunksByteLength += data.byteLength;
    // Incoming date will come in order, so this is safe to do.
    incomingChunks.push(data);

    if (chunksByteLength < 4) {
      logger.trace('Waiting for enough data to read packet size.');
      return;
    }

    // We got enough to read the packet size, we will read it only once.
    if (actualPacketLength === undefined) {
      // Read `.size` value of the packet. The doc mention that `.size`
      // value does not included itself,
      // so we add int32 size in bytes, meaning 4, to get the real size.
      const combinedData = Buffer.concat(incomingChunks, chunksByteLength);
      // Doc "The packet size field is a 32-bit little endian integer"
      const sizeValue = combinedData.readInt32LE(0);
      // Doc "Note that the packet size field itself is not included when determining the size of the packet,
      // so the value of this field is always 4 less than the packet's actual length."
      actualPacketLength = sizeValue + 4;

      // todo: why is chunksByteLength than actualPacketLength bigger sometime ?
      logger.trace(
        `Incoming packet size: ${actualPacketLength}, chunksByteLength: ${chunksByteLength}`
      );
    }

    if (chunksByteLength < 8) {
      logger.trace('Waiting for enough data to read packet id.');
      return;
    }
    if (logger.level === 'trace' && !packetId) {
      packetId = Buffer.concat(incomingChunks, chunksByteLength).readInt32LE(4);
      logger.trace(`Incoming packet id: ${packetId}`);
    }


    if (chunksByteLength < 12) {
      logger.trace('Waiting for enough data to read packet type.');
      return;
    }

    // Read the packet type once.
    if (logger.level === 'trace' && packetType === undefined) {
      const combinedData = Buffer.concat(incomingChunks, chunksByteLength);
      packetType = combinedData.readUInt32LE(8);
      logger.trace(`Incoming packet type: ${packetType}`);
    }

    if (chunksByteLength < actualPacketLength) {
      logger.trace('Waiting for enough data to read full packet.');
      return;
    }

    const combinedData = Buffer.concat(incomingChunks, chunksByteLength);
    cleanUp();

    const decodedPacket = decodePacket(combinedData);

    if (logger.level === 'trace') { // JSON.stringify is costly
      logger.trace(`Decoded packet: ${JSON.stringify(decodedPacket)}`);
    }

    onPacketCallback(decodedPacket);
  }

  return {
    cleanUp,
    onData,
  };
}


export interface Packet {
  size: number;
  id: number;
  type: PacketType;
  body: string;
}

// Add validation for packet type
function isValidPacketType(type: number): type is PacketType {
  return Object.values(PacketType).includes(type);
}

function decodePacket(packet: Buffer) {
  const size = packet.readUInt32LE(0);
  const id = packet.readUInt32LE(4);
  const type = packet.readUInt32LE(8);

  // Multi-packet responses end marker:
  // Doc "Rather than throwing out the erroneous request, SRCDS mirrors it back to the client"
  // But (Node stuff here) "The `toString('utf8')` method will decode all bytes in the specified range,
  // even if they are null bytes or non-printable characters.
  // It doesn’t treat `0x00` as a string terminator like null-terminated C strings."
  const isStringTerminator = packet.readInt16LE(12) === 0;

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
function bufToHexString(buf: Buffer<ArrayBuffer>) {
  // Same result as buf.toString("hex").match(/../g).join(" ")
  return [...buf].map(byte => byte.toString(16).padStart(2, '0')).join(' ');
}
