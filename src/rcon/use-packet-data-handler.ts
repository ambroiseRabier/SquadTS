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

  function cleanUp() {
    incomingChunks.length = 0;
    chunksByteLength = 0;
    actualPacketLength = undefined;
    packetType = undefined;
  }

  function onData(data: Buffer<ArrayBufferLike>) {
    logger.trace(`Got data: ${bufToHexString(data)}`); // todo: is pwd displayed ? on auth ? otherwise is id 0 as special

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

      logger.trace(
        `Incoming packet size: ${actualPacketLength}, chunksByteLength: ${chunksByteLength}`
      );
    }

    if (chunksByteLength < 12) {
      logger.trace('Waiting for enough data to read packet type.');
      return;
    }

    // Read the packet type once.
    if (packetType === undefined) {
      const combinedData = Buffer.concat(incomingChunks, chunksByteLength);
      packetType = combinedData.readUInt32LE(8);
    }

    if (chunksByteLength < actualPacketLength) {
      logger.trace('Waiting for enough data to read full packet.');
      return;
    }

    const combinedData = Buffer.concat(incomingChunks, chunksByteLength);
    incomingChunks.length = 0; // clear array
    chunksByteLength = 0;
    packetType = undefined;
    actualPacketLength = undefined;

    onPacketCallback(decodePacket(combinedData));
  }

  return {
    cleanUp,
    onData,
  };
}


export type Packet = ReturnType<typeof decodePacket>;

function decodePacket(packet: Buffer) {
  return {
    size: packet.readUInt32LE(0),
    id: packet.readUInt32LE(4),
    type: packet.readUInt32LE(8),
    // decoding as utf8 is compatible with ascii, not sure if we receive only ascii.
    body: packet.toString('utf8', 12, packet.byteLength - 2),
  };
}


/**
 * Output: "0a 14 1e 28" ...
 */
function bufToHexString(buf: Buffer<ArrayBuffer>) {
  // Same result as buf.toString("hex").match(/../g).join(" ")
  return [...buf].map(byte => byte.toString(16).padStart(2, '0')).join(' ');
}
