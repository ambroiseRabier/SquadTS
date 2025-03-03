/**
 * Based on https://developer.valvesoftware.com/wiki/Source_RCON_Protocol
 * With the help of:
 * - https://github.com/Matttor/SimplestSquadRcon (MIT license)
 * - https://github.com/Team-Silver-Sphere/SquadJS (Same license as this project)
 */
import net from 'net';
import { RconOptions } from './rcon.config';
import { Logger } from 'pino';
import { Subject } from 'rxjs';

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

const INT32_MAX = 2 ** 31 - 1; // 2,147,483,647
const INT32_MIN = -(2 ** 31);  // -2,147,483,648
const MAXIMUM_PACKET_RESPONSE_SIZE = 4096;
const MAX_CONNECT_RETRY = 5;

/**
 * The packet id field is a 32-bit little endian integer chosen by the client for each request.
 * It may be set to any positive integer. When the server responds to the request, the response
 * packet will have the same packet id as the original request (unless it is a failed SERVERDATA_AUTH_RESPONSE packet
 * - see below.) It need not be unique, but if a unique packet id is assigned, it can be used to match incoming
 * responses to their corresponding requests.
 */
function usePacketIdGen() {
  let currentPacketId = 0;

  // We likely can use INT32_MIN, but unlikely we ever have enough concurrent
  // RCON requests for it to be needed.
  // Also careful of -1, it is a special case.
  if (currentPacketId === INT32_MAX) {
    currentPacketId = 0;
  }

  return () => currentPacketId++;
}

/**
 * Doc: https://developer.valvesoftware.com/wiki/Source_RCON_Protocol
 */
export function useRcon(options: RconOptions, logger: Logger) {
  const client = new net.Socket();
  let connected = false;
  let failedConnectCount = 0;
  const genPacketId = usePacketIdGen(); // todo: what if there is already a callback waiting for that id ?
  const chatPacketEvent = new Subject<string>();

  function connect() {
    net.createConnection(
      {
        port: options.port,
        host: options.host,
      },
      // on "connect" event, once
      () => {
        logger.info(`Connected to ${options.host}:${options.port}`);
        failedConnectCount = 0;

        logger.info('Sending authentication packet...');
        sendAuth().then(success => {
          if (success) {
            logger.info(`Authenticated to ${options.host}:${options.port}`);
          } else {
            logger.error('Authentication failed, wrong credentials.'); // well, then stop SquadTS no ?
          }
        });
      },
    )
      .on('data', onData) // do I need to clear 'data' listener?
      .on('end', () => {
        logger.info(`Disconnected from ${options.host}:${options.port}`);
        cleanUp();
      })
      .on('error', (err: any) => () => {
        logger.error(`net.Socket error: ${err?.message}`, {err}); // todo {err} or err ? for logger error...
        cleanUp();
      });
  }

  function cleanUp() {
    connected = false;
    awaitedCallbacks.clear(); // reject callbacks?
    resPackets.length = 0;
    // handle pending promises somehow
    // if retry, do connect
    if (failedConnectCount < MAX_CONNECT_RETRY) {
      connect();
    }
  }

  function disconnect() {
    logger.info(`Disconnected from ${options.host}:${options.port}`);
    client.end(); client.destroy(); // ... uh
  }

  async function sendAuth() {
    return new Promise<boolean>((resolve) => {
      const id = genPacketId();
      const encodedPacket = encodePacket(PacketType.AUTH, genPacketId(), options.password);

      // https://developer.valvesoftware.com/wiki/Source_RCON_Protocol#SERVERDATA_AUTH_RESPONSE
      // "If auth failed, -1"
      awaitedCallbacks.set(-1, (decodedData: Packet) => {
        if (decodedData.type !== PacketType.AUTH_RESPONSE) {
          throw new Error('Unexpected packet type, only AUTH_RESPONSE is expected for id -1');
        }
        resolve(false);
      });

      // If authentication was successful, the ID assigned by the request
      awaitedCallbacks.set(id, (decodedData: Packet) => {
        if (decodedData.type !== PacketType.AUTH_RESPONSE) {
          throw new Error('Unexpected packet type, only PacketType.AUTH_RESPONSE is expected for PacketType.AUTH');
        }
        resolve(true);
      });

      // Send the packet once all callbacks are ready.
      client.write(encodedPacket);
    });
  }

  /**
   * Returns the decoded response.
   * @param packetType
   * @param body
   */
  async function sendPacket(packetType: PacketType, body: string) {
    return new Promise<string>((resolve, reject) => {
      const id = genPacketId();
      const encodedPacket = encodePacket(packetType, id, body);

      awaitedCallbacks.set(id, (decodedData: Packet) => {

      });

      // Valve doc mention 4096 as max packet size, but is it only for response or also for request?
      if (encodedPacket.length > MAXIMUM_PACKET_RESPONSE_SIZE) {
        logger.warn(`Packet may be too long, monitor to see if packet request > ${MAXIMUM_PACKET_RESPONSE_SIZE} are ok. Body: ${body}`);
      }

      client.write(encodedPacket);


      // reject?
    });
  }

  // todo: likely can isolate some logic around onData in a hook.
  const awaitedCallbacks = new Map<number, (decodedData: Packet) => void>();
  const incomingChunks: Buffer[] = [];
  let chunksByteLength = 0;
  let actualPacketLength: number | undefined;
  let packetType: PacketType | undefined;

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

    // Chat value seems to be unique to Squad. I have no idea if there can be multi-packet
    // response for chat value, I will assume there isn't.
    if (packetType === PacketType.CHAT_VALUE) {
      onChatPacket(decodePacket(combinedData));
    }
    // Doc "A SERVERDATA_RESPONSE_VALUE packet is the response to a SERVERDATA_EXECCOMMAND request."
    else if (packetType === PacketType.RESPONSE_VALUE) {
      onResPacket(decodePacket(combinedData));
    }
  }

  // Assumes there is no multi-packet response
  function onChatPacket(packet: Packet) {
    // There is no callback for chat packets.
    chatPacketEvent.next(packet.body);
  }

  let resPackets: Packet[] = [];

  function onResPacket(packet: Packet) {
    const isEmptyPacket = packet.body.length === 0;

    // Doc "Unfortunately, it can be difficult to accurately determine from the first packet
    // alone whether the response has been split.
    // One common workaround is for the client to send an empty SERVERDATA_RESPONSE_VALUE packet
    // after every SERVERDATA_EXECCOMMAND request."
    if (isEmptyPacket) {
      // We have the full packet.
      // But... Doc "Also note that requests executed asynchronously can possibly send their
      // responses out of order[1] - using a unique ID to identify and associate the
      // responses with their requests can circumvent this issue."
      const allIdMatchingPackets = resPackets
        .filter(p => p.id === packet.id);

      onResFullPacket({
        ...packet,
        // Doc "Then, the response bodies can simply be concatenated to build the full response."
        body: allIdMatchingPackets.map(p => p.body).join(''),
      });

      // Update resPackets to remove used packets.
      resPackets = resPackets
        .filter(p => p.id !== packet.id)
    } else {
      resPackets.push(packet);
    }
  }

  function onResFullPacket(packet: Packet) {
    const callback = awaitedCallbacks.get(packet.id);
    if (!callback) {
      throw new Error('Unexpected: onData: callback is null');
    }
    awaitedCallbacks.delete(packet.id);
    callback(packet);
  }


  return {
    chatPacketEvent,
  };
}




/**
 * https://developer.valvesoftware.com/wiki/Source_RCON_Protocol
 * @param type The packet type field is a 32-bit little endian integer, which indicates the purpose of the packet. Its value will always be either 0, 2, or 3.
 * @param id The packet id field is a 32-bit little endian integer chosen by the client for each request. It may be set to any positive integer. When the server responds to the request, the response packet will have the same packet id as the original request (unless it is a failed SERVERDATA_AUTH_RESPONSE packet - see below.) It need not be unique, but if a unique packet id is assigned, it can be used to match incoming responses to their corresponding requests.
 * @param body The packet body field is a null-terminated string encoded in ASCII
 */
function encodePacket(
  type: PacketType,
  id: number,
  body: string,
) {
  // Size, in bytes, of the whole packet.
  const size = Buffer.byteLength(body) + 14;
  const buffer = Buffer.alloc(size);
  buffer.writeInt32LE(size - 4, 0);
  buffer.writeInt32LE(id,       4);
  buffer.writeInt32LE(type,     8);
  buffer.write(body, 12, size - 2, 'ascii'); // maybe SquadTS support utf8 ?
  // String terminator and 8 empty bits
  buffer.writeInt16LE(0, size - 2);
  return buffer;
}
