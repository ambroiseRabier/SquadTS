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
import { Packet, usePacketDataHandler } from './use-packet-data-handler';
import { IncludesRCONCommand } from '../rcon-squad/rcon-commands';

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
  let currentPacketId = 1;

  // We likely can use INT32_MIN, but unlikely we ever have enough concurrent
  // RCON requests for it to be needed.
  // Also careful of -1, it is a special case.
  // We also reserve 0 for Auth request.
  if (currentPacketId === INT32_MAX) {
    currentPacketId = 1;
  }

  return () => currentPacketId++;
}

// todo: can we retry request in case of disconnect, instead of shuffling errors and letting the rest of the app
// having to deal with unreliable execute request? or just error whole app on rcon disconnect (boou)

/**
 * Doc: https://developer.valvesoftware.com/wiki/Source_RCON_Protocol
 */
export function useRcon(options: RconOptions, logger: Logger) {
  let client: net.Socket;
  let retryCount = 0;
  let retryDelay = 5;
  let retryTimeout: NodeJS.Timeout | undefined = undefined;
  const genPacketId = usePacketIdGen(); // todo: what if there is already a callback waiting for that id ?
  const chatPacketEvent = new Subject<string>();

  const packetDataHandler = usePacketDataHandler(logger, onPacket);

  function connect() {
    return new Promise<void>((resolve, reject) => {
      client = new net.Socket();
      client.once('connect', () => {
        logger.info(`Connected to ${options.host}:${options.port}`);
        retryCount = 0;

        logger.info('Sending authentication packet...');
        sendAuth().then(success => {
          if (success) {
            logger.info(`Authenticated to ${options.host}:${options.port}`);
            resolve();
          } else {
            logger.error('Authentication failed.');
            // If authentification fails, there is no point retrying later.
            reject('Authentication failed.');
          }
        });
      });

      client.on('data', packetDataHandler.onData);
      client.once('error', onError);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function onError(err: any) {
    logger.error(`net.Socket error: ${err?.message}`, err);
    console.error(err); // not sure if I can relay on logger to properly display the error :/
    // cleanUp(); maybe not ?
    client.removeAllListeners();
    client.destroy();

    // These operations cannot be resumed with another socket.
    resPackets.length = 0;
    packetDataHandler.cleanUp();

    // todo handle pending promises somehow
    // Retry to connect. To keep in mind:
    // - SquadTS often call for ListPlayers, ListSquads, ShowServerInfo
    // - Plugins may directly call RCON execute
    // - RCON game modifying command like warn may not make sense if sent too late.
    if (retryCount < MAX_CONNECT_RETRY) {
      logger.info(`Retrying in ${retryDelay} seconds (attempt ${retryCount}/${MAX_CONNECT_RETRY})...`);
      // May need to be coherent with how log with FTP work...
      // Since sometimes SquadTS is hosted at home, we should allow a somewhat large retry in case
      // of internet disconnect.
      retryCount++;
      retryTimeout = setTimeout(async () => {
        await connect();

        logger.info(`${awaitedCallbacks.size} pending promises will be resumed.`);

        // Immediately restart pending promise,
        for (const [id, {requestBody}] of awaitedCallbacks) {
          if (id === -1 || id === 0) {
            // If we had any pending auth refusal or auth success request, remove it
            // Although I think it is unlikely it ever happen.
            continue;
          }
          // Existing promises are listening to awaitedCallbacks on certain id.
          // If we re-use the same id, those same promise will receive the resolve.
          // noinspection ES6MissingAwait
          sendExecPacket(requestBody, id);
        }

      }, retryDelay * 1000);
      retryDelay *= 2; // 5, 10, 20, 40, 80
    } else {
      logger.error('Max retry reached, giving up.');
      cleanUp();
      // Likely this should call disconnect which will call cleanUp...
      // Maybe I make something better than relying on UncaughtError in main.mts ?
      throw new Error('RCON disconnected after max retry reached.')
    }
  }

  function cleanUp() {
    client.destroy();
    // Because you think removing unused variables make the code easier to understand here eslint ??
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [id, {resolve, reject, requestBody}] of awaitedCallbacks) {
      reject(new Error('Cleanup was called, rejecting all pending requests.'))
    }
    awaitedCallbacks.clear();
    resPackets.length = 0;
    packetDataHandler.cleanUp();
    if (retryTimeout) {
      clearTimeout(retryTimeout);
    }
  }

  function disconnect() {
    return new Promise<void>((resolve) => {
      logger.info(`Disconnected from ${options.host}:${options.port}`);
      client.removeListener('data', packetDataHandler.onData);

      // Force disconnect in 3 seconds if close isn't called.
      const forceTimeout = setTimeout(() => {
        // doubling error because this may needs some debugging later
        console.error('Forcefully disconnecting from RCON server...');
        cleanUp();
        throw new Error('Forcefully disconnecting from RCON server...');
      }, 3000);

      // Since we wait for close, there should be not pending promise due to
      // waiting data from RCON server.
      client.once('close', () => {
        clearTimeout(forceTimeout);
        console.assert(awaitedCallbacks.size === 0,
          'Expected awaitedCallbacks to be empty when close event is called in graceful shutdown :/ ?');
        cleanUp();
        resolve();
      });
      client.end();
    });
  }

  // todo test behavior with empty pwd and wrong pwd.
  async function sendAuth() {
    return new Promise<boolean>((resolve, reject) => {
      // Reserved 0 id for auth request. (SquadTS choice, not a Valve doc)
      const encodedPacket = encodePacket(PacketType.AUTH, 0, options.password);

      // https://developer.valvesoftware.com/wiki/Source_RCON_Protocol#SERVERDATA_AUTH_RESPONSE
      // Doc "If auth failed, -1"
      awaitedCallbacks.set(-1, {
        resolve: () => {
          awaitedCallbacks.delete(0);
          resolve(false);
        },
        reject,
        requestBody: '', // not needed, auth won't be resumed.
      });

      // Doc "If authentication was successful, the ID assigned by the request"
      awaitedCallbacks.set(0, {
        resolve: () => {
          awaitedCallbacks.delete(-1);
          resolve(true);
        },
        reject,
        requestBody: '', // not needed, auth won't be resumed.
      });

      // Send the packet
      client.write(encodedPacket);
    });
  }

  /**
   * Returns the decoded response.
   */
  async function sendExecPacket(body: string, forceId?: number) {
    return new Promise<string>((resolve, reject) => {
      const id = forceId ?? genPacketId();

      // Well, this should never happen, we don't have Max int concurrent RCON requests...
      if (awaitedCallbacks.has(id)) {
        throw new Error(
          `Unexpected: ID ${id}, with request body ${awaitedCallbacks.get(id)?.requestBody} already has a callback.\n`
          + `Either you have more than ${INT32_MAX} concurrent requests... Or you are using reserved id like -1 and 0`)
      }

      const encodedPacket = encodePacket(PacketType.EXEC_COMMAND, id, body);

      awaitedCallbacks.set(id, {
        resolve: (decodedData: Packet) => {
          logger.debug(`Received packet with id ${id}`);
          resolve(decodedData.body);
        },
        reject,
        requestBody: body,
      });

      // Valve doc mention 4096 as max packet size, but is it only for response or also for request?
      if (encodedPacket.length > MAXIMUM_PACKET_RESPONSE_SIZE) {
        logger.warn(`Packet may be too long, monitor to see if packet request > ${MAXIMUM_PACKET_RESPONSE_SIZE} are ok. Body: ${body}`);
      }

      client.write(encodedPacket);
      // Necessary to identify multi-packets responses (and we don't know which of Squad server response will be multi-packet,
      // so every exec has this extra packet).
      client.write(encodePacket(PacketType.EXEC_COMMAND, id, ''));
    });
  }

  // todo: likely can isolate some logic around onData in a hook.
  const awaitedCallbacks = new Map<
    number,
    {
      // Return the received decoded data once obtained through the socket.
      resolve: (decodedData: Packet) => void;

      // Will be used to reject pending promises when SquadTS stops, we are trying
      // to close net.Socket gracefully, so every RCON promise should have
      // returned before net.Socket close.
      reject: (error: Error) => void;

      // Will be used to resume the promise in case of disconnect..
      requestBody: string;
    }
  >();

  function onPacket(packet: Packet) {
    // Chat value seems to be unique to Squad. I have no idea if there can be multi-packet
    // response for chat value, I will assume there isn't.
    // Assumes there is no multi-packet response
    if (packet.type === PacketType.CHAT_VALUE) {
      // There is no callback for chat packets.
      logger.debug(`Chat message: ${packet.body}`);
      chatPacketEvent.next(packet.body);
    }
    // Doc "A SERVERDATA_RESPONSE_VALUE packet is the response to a SERVERDATA_EXECCOMMAND request."
    else if (packet.type === PacketType.RESPONSE_VALUE) {
      onResPacket(packet);
    }
    else if (packet.type === PacketType.AUTH_RESPONSE) {
      executePacketCallback(packet);
    }
    else {
      // Either indicating a mistake, or a new type of packet after a Squad update.
      logger.warn(`Unknown packet type ${packet.type} with body: ${packet.body}`);
    }
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

      executePacketCallback({
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

  function executePacketCallback(packet: Packet) {
    if (!awaitedCallbacks.has(packet.id)) {
      throw new Error('Unexpected: onData: callback is null');
    }

    // Safe here because has above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const { resolve } = awaitedCallbacks.get(packet.id)!;
    awaitedCallbacks.delete(packet.id);
    resolve(packet);
  }


  function execute<T extends string>(command: IncludesRCONCommand<T>) {
    return sendExecPacket(command);
  }

  return {
    chatPacketEvent,
    execute,
    connect,
    disconnect,
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
