import { Logger } from 'pino';
import { bufToHexString, decodePacket, Packet, PacketType } from './packet';
import * as util from 'node:util';

/*
* Looking at rcon.js decodeData function in SquadJS, it handles the follow packet correctly:
* Reading the code it reads:
* Starting from: `const decodedPacket = this.decodePacket(packet);`
* decode the packet, find matching id (count), if matching id or auth_res or chat_value,
* then send the packet to onPacket, `continue` means going at the top of the while, to search
* for more packets (I use recursion, a while loop is better though).
* We recheck while condition which is `this.incomingData.byteLength >= 4`,
* in case we have not enough bytes, we need to wait for more data `decodeData` call, if we have enough
* check packet size and wait for more data if needed.
* Once we think we have the full packet, we check id, but since this is a follow response, there is no matching id.
* In this case we end up at `const probePacketSize = 21;` line.
* We likely don't need to check if size is 10. if incoming data length is less than 21 (14 + 7 bytes of the follow response)
* we wait for more data, else, we confirm the "broken packet" (follow response), remove it and check for more data
* by going at the top of while loop.
* Looks fine to me.
*
* Does SquadJS actually need the `matchCount` false to detect "follow response"?
* Any packet of size 10, that is not of type auth_res or chat_val, should have 7 extra bytes checked before being sent.
*
* Conclusion: I like the while loop. I see no issue with SquadJS implementation.
*
* Extra: I have no idea what this issue is about, and if I am concerned: https://github.com/Team-Silver-Sphere/SquadJS/pull/291
*/

const followResponseEnd = Buffer.from([0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00]);


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

  /**
   * 2 is the size of the body of a "follow response" WHICH IS NOT INCLUDED
   * in the size field of the packet.
   */
  // function actualPacketLengthIfFollowResponse() {
  //   return actualPacketLength + 2;
  // }

  function cleanUp() {
    incomingChunks.length = 0; // clear array, keep reference
    chunksByteLength = 0;
    actualPacketLength = undefined;
  }

  function onData(data: Buffer<ArrayBufferLike>) {
    // Note: auth request will not come back with password, so we won't display the password here.
    logger.trace(`Got data: ${bufToHexString(data)}`);

    // One log trace function, that log as much as possible, usable anywhere safely in onDate function.
    function logTracePacket() {
      if (logger.level !== 'trace') {
        return;
      }
      const combinedData = Buffer.concat(incomingChunks, chunksByteLength);
      const size = combinedData.length >= 4 && data.readUInt32LE(0);
      const id = combinedData.length >= 8 && data.readUInt32LE(4);
      const type = combinedData.length >= 12 && data.readUInt32LE(8);
      logger.trace(`Incoming packet: ${util.inspect({ size, id, type })}`);
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

    // Everything. May contain multiple packets.
    const combinedData = Buffer.concat(incomingChunks, chunksByteLength);

    // Doc "If the combined length of the Buffers in list exceeds totalLength, the result is truncated to totalLength."
    // We may have the start of the next packet in the incomingChunks,
    // so instead of using chunksByteLength we use actualPacketLength.
    const singlePacketData = combinedData.subarray(0, actualPacketLength);

    // save remaining data if there is any. (chunksByteLength > actualPacketLength)
    let remainingData = combinedData.subarray(actualPacketLength);

    // Default to false.
    let isFollowResponse = false;
    // Size fore empty or follow response is reported the same, for both, in size field.
    // An empty body real packet size is 14, but size field will be 10.
    const isEmptyBodyOrFollowResponse = singlePacketData.readInt32LE(0) === 10;
    // Special case where auth response does not have a follow response.
    // If we wait for a "follow response" that will never come, then auth pack will never be sent to SquadTS, meaning
    // SquadTS will hang.
    const isAuthResponseType = singlePacketData.readInt32LE(8) === PacketType.AUTH_RESPONSE;
    // SquadJS send empty body for Exec packet type, and SquadTS with response_value packet type.
    // so follow response can for sure happen for these two types.
    // likely... any type but AUTH_RESPONSE can receive a follow response.
    //
    // Since we also receive CHAT_VALUE, even though CHAT_VALUE body probably never will be empty, when send from in-game.
    // It could be empty if sent from an admin command.
    // We do not want to await check for a follow response in case we receive a single CHAT_VALUE with empty body.
    // So we also exclude it:
    const isChatValueType = singlePacketData.readInt32LE(8) === PacketType.CHAT_VALUE;

    // What if... the response itself, has an empty body?
    // Then we would have to wait for the empty packet (end of multi-packet marker)
    // that itself will wait for "follow response"
    // --> So we're fine in that regard!

    if (isEmptyBodyOrFollowResponse && !isAuthResponseType && !isChatValueType) {
      logger.trace('Empty body or follow response. (except auth empty body)');
      // "follow response" will contain extra bytes: 00 01 00 00 00 00 00 (7 bytes)
      // Valve's doc indicate 0x0000 0001 0000 0000, which is 8 bytes long,
      // Unless I am missing something, it is different.
      if (remainingData.length < 7) {
        logger.trace('Waiting for enough data to determine between empty body or follow response.');
        logTracePacket();
        return;
      } else {
        // Since follow responses are always right behind a mirrored empty body response.
        // It means:
        // 1. Mirror response, size 10, size with size field 14, real packet size 14, size field: "0x0A 0x00 0x00 0x00"
        // 1.1 Check readInt16LE(0) on 2 extra bytes, will give `0x0A 0x00` (10)
        // 2. Follow response, size 10, size with size field 14, real packet size 16, size field: "0x0A 0x00 0x00 0x00"
        // 2.2 Check readInt16LE(0) on 2 extra bytes, will give `0x00 0x01` (256) (which is different from previous empty body response)
        //
        // In another word, both `remainingData.readInt16LE(0)` and `readInt32LE(0) === 10` cannot be true at the same time.
        // In another word (2), an empty packet, followed by another empty packet, will never be confused with a "follow response".
        // const followResponseEndMarker = remainingData.readInt16LE(0) === 256;

        const followResponseEndMarker = remainingData.subarray(0, 7).equals(followResponseEnd);

        if (followResponseEndMarker) {
          isFollowResponse = true;
          // Remove those 7 bytes.
          remainingData = remainingData.subarray(7);
        } else {
          isFollowResponse = false;
        }
        logger.trace(`isFollowResponse: ${isFollowResponse}`);
      }
    }


    cleanUp();

    // todo: should wait up for 2 extra bytes since we may have a cut...
    // todo: in SquadJS they say it is 3 extra bytes ? That is what they call "broken" or "bad" packet.

    // // 2 is the size of the body of a "follow response"
    // // 21 is the full size of a packet including string terminator and 8 empty bits. (field size in the packet will be 14)
    // // In other words, we just got an empty body packet a
    // if (remainingData.length >= 2 && singlePacketData.length === 21) {
    //   // Note: No idea why Valve's protocol adds this complexity :/ (well, maybe it is Squad server not following specs?)
    //   //
    //   // Doc "Rather than throwing out the erroneous request, SRCDS mirrors it back to the client,
    //   // followed by another RESPONSE_VALUE packet containing 0x0000 0001 0000 0000 in the packet body field"
    //   //
    //   // That extra content in the body IS NOT INCLUDED in the size field.
    //   // So the hard question is: how to know if this is part of a "follow response" or part of the next packet?
    //   // size field reads the 4 first bytes, "follow response" body is 2 bytes long.
    //   const followResponseEndMarker = remainingData.readInt16LE(0) === 256;
    // }

    const decodedPacket = {
      ...decodePacket(singlePacketData),
      isFollowResponse
    };

    if (logger.level === 'trace') { // JSON.stringify / util.inspect is costly
      if (remainingData.length > 0) {
        logger.trace(`Remaining data (${remainingData.length}): ${bufToHexString(remainingData)}`);
      }
      logger.trace(`Decoded packet: ${util.inspect(decodedPacket)}`);
    }

    onPacketCallback(decodedPacket);

    // Since we may already have one or many full packets in the remaining data, we should
    // not wait for more data from RCON Squad server to check.
    // To preserve order of packets received, we call onData after sending the packet to the
    // callback.
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

