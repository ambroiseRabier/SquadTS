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
import { IncludesRCONCommand, RCONCommand } from '../rcon-squad/rcon-commands';
import { hasChangesIgnoringSinceDisconnect } from './has-change-since-disconnect';
import { useRetryConnect } from './use-retry-connect';

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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const INT32_MIN = -(2 ** 31); // -2,147,483,648
const MAXIMUM_PACKET_RESPONSE_SIZE = 4096;

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

export type Rcon = ReturnType<typeof useRcon>;

/**
 * Doc: https://developer.valvesoftware.com/wiki/Source_RCON_Protocol
 */
export function useRcon(options: RconOptions, logger: Logger) {
  let client: net.Socket;
  const genPacketId = usePacketIdGen(); // todo: what if there is already a callback waiting for that id ?
  const chatPacketEvent = new Subject<string>();
  const packetDataHandler = usePacketDataHandler(logger, onPacket);

  // todo test behavior with empty pwd and wrong pwd.
  function connect() {
    return new Promise<void>((resolve, reject) => {
      client = new net.Socket(); // allowHalfOpen ?, keepAlive ?

      function earlyError(error: Error) {
        // Remove connect listener
        client.removeAllListeners();
        client.destroy();
        reject(error);
      }

      // https://nodejs.org/api/net.html#socketconnect
      // "If there is a problem connecting, instead of a 'connect' event, an 'error' event will be emitted with the error passed to the 'error' listener."
      client.once('error', earlyError);

      client.once('connect', () => {
        logger.info(`Connected to ${options.host}:${options.port}`);
        logger.info('Sending authentication packet...');

        // Doc "When the server receives an auth request, it will respond with an empty SERVERDATA_RESPONSE_VALUE,
        // followed immediately by a SERVERDATA_AUTH_RESPONSE indicating whether authentication succeeded or failed."
        // Meaning we await two packets.
        function* authPacketsGenerator() {
          // Note about generators: I've learned that passing packet as parameter of `authPackets`
          // is not okay as the parameter will be re-used on next yield if "next" is called
          // without parameter. Not that I would do that!
          // But being more explicit fix the issue.

          // Simply ignore the first packet
          let packet: Packet = yield;
          if (packet.type !== PacketType.RESPONSE_VALUE) {
            throw new Error(
              `Unexpected first packet type ${packet.type} with body: ${packet.body}`
            );
          }

          // This contains the info we need
          packet = yield;
          if (packet.type !== PacketType.AUTH_RESPONSE) {
            throw new Error(
              `Unexpected first packet type ${packet.type} with body: ${packet.body}`
            );
          }
          // Doc "Note that the status code is returned in the packet id field"
          // "If authentication was successful, the ID assigned by the request. If auth failed, -1 (0xFF FF FF FF)"
          if (packet.id !== -1) {
            onAuthSuccess();
          } else {
            onAuthFail();
          }
        }

        const handleAuthPackets = authPacketsGenerator();
        // Start the generator
        handleAuthPackets.next();

        // handleAuthPackets.next will be called exactly two times more.
        // Note: I believe handling auth data separately from other responses make it easier to follow and debug.
        // cleanup from hook is not needed here, as it onData will not be re-used after auth.
        const { onData: onAuthData } = usePacketDataHandler(
          logger,
          handleAuthPackets.next.bind(handleAuthPackets)
        );

        // It seems either my Squad server host or Squad itself behaves not like in the Valve's doc.
        // Instead of sending -1 for response for failed auth, I just get disconnected.
        function onEarlyEnd() {
          // Make sure client also get destroyed (it will be anyway, but we don't want to wait)
          client.destroy();
          reject(new Error('Authentication failed.'));
        }

        // Listen to data before sending auth response
        client.on('data', data => {
          onAuthData(data);
        });
        client.once('end', onEarlyEnd);

        // Reserved 0 id for auth.
        const encodedPacket = encodePacket(PacketType.AUTH, 0, options.password);
        client.write(encodedPacket);

        function onAuthSuccess() {
          logger.info(`Authenticated to ${options.host}:${options.port}`);

          // Remove listeners used for auth only.
          client.removeListener('error', earlyError);
          client.removeListener('data', onAuthData);
          client.removeListener('end', onEarlyEnd);

          // listen to error
          client.once('error', onError);
          // listen to data
          client.on('data', packetDataHandler.onData);

          resolve(); // auth succeeded
        }

        function onAuthFail() {
          logger.error('Authentication failed.');

          // remove error listener
          client.removeAllListeners();
          client.destroy();
          // If authentification fails, there is no point retrying later.

          reject(new Error('Authentication failed.'));
        }
      });

      // Last but not least
      client.connect(options.port, options.host);
    });
  }

  let pendingExecute = 0;
  let pendingExecuteWithoutCallback = 0;

  // setTimeout(() => {
  //   onError(new Error('fsdf'))
  // }, 18000)

  const {retryTimeout, retryConnect, retryComplete} = useRetryConnect({
    logger,
    connect,
    cleanUp,
    logResumePendingExecutes: () => {
      logger.info(`${pendingExecuteWithoutCallback} pending execute without callback will be resumed.`);
    },
    resumePendingExecuteCallbacks: () => {
      logger.info(`${pendingExecute} total pending execute will be resumed.`);
      logger.info(`${awaitedCallbacks.size} pending execute with callback will be resumed.`);

      // Immediately restart pending promise,
      for (const [id, {requestBody}] of awaitedCallbacks) {
        if (id === -1 || id === 0) {
          // If we had any pending auth refusal or auth success request, remove it
          // Although I think it is unlikely it ever happen.
          continue;
        }
        // Existing promises are listening to awaitedCallbacks on certain id.
        // If we re-use the same id, those same promise will be resolved if a packet with correct id come as response.
        const encodedPacket = encodePacket(PacketType.EXEC_COMMAND, id, requestBody);
        client.write(encodedPacket);
        // Necessary to identify multi-packets responses (and we don't know which of Squad server response will be multi-packet,
        // so every exec has this extra packet).
        client.write(encodePacket(PacketType.EXEC_COMMAND, id, ''));
      }
    },
  });

  // todo likely can move that into another file.
  /**
   * onError will be called when a packet is sent but fail due to absence of internet connection.
   * Maybe also if the Squad server is restarting.
   */ // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function onError(err: any) {
    // Inform
    logger.error(`net.Socket error: ${err?.message}`, err);
    console.error(err); // not sure if I can relay on logger to properly display the error :/

    // cleanup the socket partially
    client.removeAllListeners();
    client.destroy();

    // These operations cannot be resumed with another socket.
    resPackets.length = 0;
    packetDataHandler.cleanUp();

    retryConnect();
  }

  function cleanUp() {
    if (retryTimeout) {
      clearTimeout(retryTimeout);
    }
    client.removeAllListeners();
    client.destroy();
    // Because you think removing unused variables make the code easier to understand here eslint ??
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [id, { resolve, reject, requestBody }] of awaitedCallbacks) {
      reject(new Error('Cleanup was called, rejecting all pending requests.'));
    }
    awaitedCallbacks.clear();
    resPackets.length = 0;
    packetDataHandler.cleanUp();
  }

  function disconnect() {
    return new Promise<void>(resolve => {
      logger.info(`Disconnected from ${options.host}:${options.port}`);

      // Note, plugins are shutdown first, they've got some time to
      // await some RCON response if they REALLY need to.
      // if there is still some RCON request pending, it is either bad luck
      // for the plugin, or just the ListPlayers loop that is not critical...

      // Not sure here, when using end, it seems Squad server never end the connection
      // on his side, meaning the socket remains open indefinitely.
      // So instead of gracefully shutting it down, we force close it,
      // resetAndDestroy seems to be the way to do it when it is not due to an error.
      // client.end();
      client.resetAndDestroy();
      cleanUp();
      resolve();
    });
  }


  /**
   * Returns the decoded response.
   */
  async function sendExecPacket(body: string) {
    return new Promise<Packet>((resolve, reject) => {
      const id = genPacketId();

      // Well, this should never happen, we don't have Max int concurrent RCON requests...
      if (awaitedCallbacks.has(id)) {
        throw new Error(
          `Unexpected: ID ${id}, with request body ${awaitedCallbacks.get(id)?.requestBody} already has a callback.\n` +
            `Either you have more than ${INT32_MAX} concurrent requests... Or you are using reserved id like -1 and 0 ?`
        );
      }

      const encodedPacket = encodePacket(PacketType.EXEC_COMMAND, id, body);

      // 'data' event will use id sent in the packet to find resolve and reject.
      awaitedCallbacks.set(id, {
        resolve,
        reject,
        requestBody: body,
      });

      // Valve doc mention 4096 as max packet size, but is it only for response or also for request?
      if (encodedPacket.length > MAXIMUM_PACKET_RESPONSE_SIZE) {
        logger.warn(
          `Packet may be too long, monitor to see if packet request > ${MAXIMUM_PACKET_RESPONSE_SIZE} are ok. Body: ${body}`
        );
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
    // Doc "followed by another RESPONSE_VALUE packet containing 0x0000 0001 0000 0000 in the packet body field."
    // Ignore these packets, we do not need them.
    if (packet.isFollowResponse) {
      return;
    }

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
      // Special handler because RESPONSE_VALUE can have multi-packets response
      onResPacket(packet);
    } else {
      // Auth responses are handled separately
      // Either indicating a mistake, or a new type of packet after a Squad update.
      logger.warn(`Unknown packet type ${packet.type} with body: ${packet.body}`);
    }
  }

  let resPackets: Packet[] = [];

  /**
   * Handle packets of type PacketType.RESPONSE_VALUE
   */
  function onResPacket(packet: Packet) {
    if (packet.type !== PacketType.RESPONSE_VALUE) {
      throw new Error(`Unexpected packet type ${packet.type} with body: ${packet.body}`);
    }

    const isEmptyPacket = packet.body.length === 0;

    // Doc "Unfortunately, it can be difficult to accurately determine from the first packet
    // alone whether the response has been split.
    // One common workaround is for the client to send an empty SERVERDATA_RESPONSE_VALUE packet
    // after every SERVERDATA_EXECCOMMAND request."
    //
    // Doc again " receiving a response packet with an empty packet body guarantees that all of the meaningful response packets have already been received"
    if (isEmptyPacket) {
      // We have the full packet.
      // But... Doc "Also note that requests executed asynchronously can possibly send their
      // responses out of order[1] - using a unique ID to identify and associate the
      // responses with their requests can circumvent this issue."
      const allIdMatchingPackets = resPackets.filter(p => p.id === packet.id);

      executePacketCallback({
        ...packet,
        // Doc "Then, the response bodies can simply be concatenated to build the full response."
        body: allIdMatchingPackets.map(p => p.body).join(''),
      });

      // Update resPackets to remove used packets.
      resPackets = resPackets.filter(p => p.id !== packet.id);
    } else {
      resPackets.push(packet);
    }
  }

  function executePacketCallback(packet: Packet) {
    if (!awaitedCallbacks.has(packet.id)) {
      throw new Error(
        `Unexpected: onData: callback is not set for id ${packet.id}, with body: ${packet.body}`
      );
    }

    // Safe here because has above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const { resolve } = awaitedCallbacks.get(packet.id)!;
    awaitedCallbacks.delete(packet.id);
    resolve(packet);
  }

  const cachedResponse = new Map<Lowercase<RCONCommand>, string>();

  async function execute<T extends string>(command: IncludesRCONCommand<T>) {
    pendingExecute++;
    pendingExecuteWithoutCallback++;

    // Currently retrying, wait for retry to be successful or abort request with the server...
    if (retryComplete) {
      await retryComplete;
    }
    pendingExecuteWithoutCallback--;

    if (!client.writable) {
      throw new Error('RCON socket is not writable, did you make a RCON request after disconnect ?');
    }

    logger.trace(`Executing command: ${command}`);
    return await sendExecPacket(command).then(res => {
      pendingExecute--;
      return res.body;
    }).then(res => {
      // This is executed before `execute` returns.
      logExecute(command, res);
      return res;
    });
  }

  function logExecute(command: string, res: string) {
    const emitDebugLog = (cacheEnabledForCommand = false) =>
      logger.debug(
        `Command ${cacheEnabledForCommand ? '(logging only when changed)' : ''}: "${command}" --> "${res}"`
      );

    // Option to reduce verboseness.
    if (options.debugCondenseLogs) {
      // Note: case-insensitive matching.
      const cl = command.match(/^(\w+) ?/);
      if (!cl) {
        throw Error(`Unexpected command (or wrong regex here): ${command}`);
      }
      const baseCommand = cl[1].toLowerCase() as Lowercase<RCONCommand>;
      const cachedRes = cachedResponse.get(baseCommand);

      const emitIfChanged = () => {
        // Not cached, or cached, but res is different.
        if (!cachedRes || (cachedRes && cachedRes !== res)) {
          emitDebugLog(true);
          cachedResponse.set(baseCommand, res);
        }
      };

      switch (baseCommand) {
        case RCONCommand.ListPlayers.toLowerCase():
          // Extra option to further reduce the verboseness, right now, disconnect player are not used at all.
          if (options.debugCondenseLogsIgnoreSinceDisconnect) {
            if (cachedRes) {
              if (hasChangesIgnoringSinceDisconnect(cachedRes, res)) {
                emitDebugLog(true);
              } // else no change, doesn't emit
            } else {
              // not cached
              emitDebugLog(true);
            }
          } else {
            // No special behavior for ListPlayers
            emitIfChanged();
          }
          break;
        case RCONCommand.ShowServerInfo.toLowerCase():
        case RCONCommand.ListSquads.toLowerCase():
          emitIfChanged();
          break;
        default:
          emitDebugLog();
      }
    } else {
      emitDebugLog();
    }
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
function encodePacket(type: PacketType, id: number, body: string) {
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
