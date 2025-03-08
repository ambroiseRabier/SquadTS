import { Logger } from 'pino';
import { bufToHexString, debugDecodePacket, decodePacket, Packet, PacketType } from './packet';
import * as util from 'node:util';

// todo: refactor into a while loop instead of using recursion, useful if very large 'data' events.

/**
 * If you find these bytes bellow, between index 14 to 21, you've got yourself a "follow response".
 *
 * Note that it differs from Valve's doc "0x0000 0001 0000 0000" which would be:
 * 00 00 00 00 01 00 00 00
 * by being
 * 00 00 00 01 00 00 00
 *
 * Also note that UE4 RCON is used, which has no doc and is closed source.
 */
const followResponseEnd = Buffer.from([0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00]);

/**
 * Handle raw data, transform it into a Packet.
 * Use `onData` as callback for 'data' socket event.
 *
 * Call `onPacketCallback` when finished decoding a packet.
 *
 * `cleanUp` can be called if you need to remove all buffered chunks.
 * For example, if the socket closed, and you made a new one.
 */
export function usePacketDataHandler(logger: Logger, onPacketCallback: (packet: Packet) => void) {
  const incomingChunks: Buffer[] = [];
  let chunksByteLength = 0;
  let actualPacketLength: number | undefined;

  function cleanUp() {
    incomingChunks.length = 0; // clear array, keep reference
    chunksByteLength = 0;
    actualPacketLength = undefined;
  }

  function onData(data: Buffer<ArrayBufferLike>) {
    // Note: auth request will not come back with password, so we won't display the password here.
    logger.trace(`Got data: ${bufToHexString(data)}`);

    // Helper. Log as much as possible, usable anywhere safely.
    function logTracePacket() {
      if (logger.level !== 'trace') {
        return;
      }
      const combinedData = Buffer.concat(incomingChunks, chunksByteLength);
      logger.trace(debugDecodePacket(combinedData));
    }

    chunksByteLength += data.byteLength;
    // Incoming date will come in order, so this is safe to do.
    incomingChunks.push(data);

    if (chunksByteLength < 4) {
      logger.trace('Waiting for enough data to read packet size.');
      logTracePacket();
      return;
    }

    // We got enough to read the packet size, we will read it only once.
    if (actualPacketLength === undefined) {
      const combinedData = Buffer.concat(incomingChunks, chunksByteLength);
      // Doc "The packet size field is a 32-bit little endian integer"
      const sizeValue = combinedData.readInt32LE(0);
      // Doc "Note that the packet size field itself is not included when determining the size of the packet,
      // so the value of this field is always 4 less than the packet's actual length."
      // size field is int32, so 4 long
      actualPacketLength = sizeValue + 4;

      logger.trace(
        `Incoming packet size: ${actualPacketLength}, chunksByteLength: ${chunksByteLength}`
      );
    }

    if (chunksByteLength < 8) {
      logger.trace('Waiting for enough data to read packet id.');
      logTracePacket();
      return;
    }

    if (chunksByteLength < 12) {
      logger.trace('Waiting for enough data to read packet type.');
      logTracePacket();
      return;
    }

    if (chunksByteLength < actualPacketLength) {
      logger.trace('Waiting for enough data to read full packet.');
      logTracePacket();
      return;
    }

    // Everything. May contain multiple packets. Contain at least one.
    const combinedData = Buffer.concat(incomingChunks, chunksByteLength);

    // Retrieve the first packet inside combinedData, based on actualPacketLength, do not confuse with chunksByteLength
    // that may contain the start of the next packet.
    const singlePacketData = combinedData.subarray(0, actualPacketLength);

    // Save the remaining data, if there is any. (chunksByteLength > actualPacketLength)
    let remainingData = combinedData.subarray(actualPacketLength);

    // Special boolean to indicate a follow response. See bellow for more explanations.
    // Default to false.
    let isFollowResponse = false;

    // Size for empty or follow response is reported the same, for both, in size field.
    // An empty body real packet size is 14, but size field will be 10.
    const isEmptyBodyOrFollowResponse = singlePacketData.readInt32LE(0) === 10;

    // Special case where auth response does not have a follow response.
    // If we wait for a "follow response" that will never come, then auth pack will never be sent to SquadTS,
    // meaning SquadTS will hang.
    const isAuthResponseType = singlePacketData.readInt32LE(8) === PacketType.AUTH_RESPONSE;

    // Since we also receive CHAT_VALUE, even though CHAT_VALUE body probably never will be empty, when send from in-game.
    // It could be empty if sent from an admin command.
    // We do not want to await a check for a follow response in case we receive a single CHAT_VALUE with empty body.
    // So we also exclude it:
    const isChatValueType = singlePacketData.readInt32LE(8) === PacketType.CHAT_VALUE;

    // What if... the response itself, has an empty body?
    // Then we would have to wait for the empty packet (end of multi-packet marker)
    // that itself will wait for "follow response"
    // --> So we're fine in that regard!

    // There should leave use with two type of packet here:
    // SquadJS send empty body with EXEC_COMMAND packet type, and SquadTS with RESPONSE_VALUE packet type.
    if (isEmptyBodyOrFollowResponse && !isAuthResponseType && !isChatValueType) {
      logger.trace('Empty body or follow response. (except auth or chat)');
      // "follow response" will contain extra bytes: 00 01 00 00 00 00 00 (7 bytes)
      // WHICH IS NOT INCLUDED in size field: when you expect size field to be 17, it is 10 instead.
      //
      // Valve's doc indicates we should receive 0x0000 0001 0000 0000, which is 8 bytes long,
      // However, this uses UE4 RCON (which is not documented and closed source),
      // and it appears we receive a 7 bytes long end marker of a "follow response".
      if (remainingData.length < followResponseEnd.length) {
        logger.trace('Waiting for enough data to determine between empty body or follow response.');
        logTracePacket();
        return;
      } else {
        // Will there be false positive of "follow response" on other empty responses? (short answer: no)
        //
        // Since follow responses are always right behind a mirrored empty body response.
        // It means:
        // 1. Mirror response, size 10, size with size field 14, real packet size 14, size field: "0x0A 0x00 0x00 0x00"
        // 1.1 Check readInt16LE(0) on 2 extra bytes, will give `0x0A 0x00` (10)
        // 2. Follow response, size 10, size with size field 14, real packet size 16, size field: "0x0A 0x00 0x00 0x00"
        // 2.2 Check readInt16LE(0) on 2 extra bytes, will give `0x00 0x01` (256) (which is different from previous empty body response)
        //
        // In another word, both `remainingData.readInt16LE(0)` and `readInt32LE(0) === 10` cannot be true at the same time.
        // In another word, an empty packet, followed by another empty packet, will never be confused with a "follow response".
        //
        // Update: `remainingData.readInt16LE(0)` has been replace with reading the full 7 bytes of followResponseEnd.

        // The empty packet we received earlier is 14 bytes longs (like any other empty packet), with the followResponseEnd
        // it is 21 long, that +7 is stored in remainingData.
        const followResponseEndMarker = remainingData
          .subarray(0, followResponseEnd.length)
          .equals(followResponseEnd);

        if (followResponseEndMarker) {
          // Flag as a follow response
          isFollowResponse = true;
          // Remove those 7 bytes.
          remainingData = remainingData.subarray(followResponseEnd.length);
        } else {
          isFollowResponse = false;
        }
        logger.trace(`isFollowResponse: ${isFollowResponse}`);
      }
    }

    cleanUp();

    const decodedPacket = {
      ...decodePacket(singlePacketData),
      isFollowResponse,
    };

    if (logger.level === 'trace') {
      if (remainingData.length > 0) {
        logger.trace(`Remaining data (${remainingData.length}): ${bufToHexString(remainingData)}`);
      }
      logger.trace(`Decoded packet: ${util.inspect(decodedPacket, false, null, true)}`);
    }

    onPacketCallback(decodedPacket);

    // If we have remaining data, use recursion to exhaust it. We could have received multiples packets.
    // This had to be called after packet callback to preserve the order of packets.
    if (remainingData.length > 0) {
      logger.trace(`Sending remaining data (${remainingData.length}) to onData.`);
      onData(remainingData);
    }
  }

  return {
    cleanUp,
    onData,
  };
}
