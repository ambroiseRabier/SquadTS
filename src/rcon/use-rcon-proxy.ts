import net from 'node:net';
import { Logger } from 'pino';
import { Rcon } from './use-rcon';
import { bufToHexString, decodePacket, encodePacket, MAXIMUM_PACKET_RESPONSE_SIZE, Packet, PacketType } from './packet';
import { Subscription } from 'rxjs';
import * as util from 'node:util';
import { usePacketDataHandler } from './use-packet-data-handler';

interface ProxyOptions {
  password: string;
  port: number;
}

export type RCONProxy = ReturnType<typeof useRconProxy>;

/**
 * Emulate a Squad RCON server based on https://developer.valvesoftware.com/wiki/Source_RCON_Protocol
 * and what we know from use-rcon.
 */
export function useRconProxy(logger: Logger, rcon: Rcon, options: ProxyOptions) {
  const server = net.createServer(client => {
    logger.info('New client connected to the RCON proxy.');

    function transmitChat(message: string) {
      client.write(encodePacket(
        PacketType.CHAT_VALUE,
        // Unless mistaken, SquadJS and SquadTS does not check id field on CHAT_VALUE
        // I don't know if Squad server sends anything useful in id field.
        0,
        message
      ));
    }

    let subChat: Subscription;
    let clientAuthenticated = false;

    function onNonAuthData(packet: Packet) {
      if (packet.type === PacketType.AUTH) {
        if (packet.body === options.password) {
          logger.info('Client authenticated.');
          // First response is an empty RESPONSE_VALUE packet
          client.write(encodePacket(
            PacketType.RESPONSE_VALUE,
            packet.id,
            ''
          ));
          // Return AUTH_RESPONSE with the same id
          client.write(encodePacket(
            PacketType.AUTH_RESPONSE,
            packet.id,
            ''
          ));
          subChat = rcon.chatPacketEvent.subscribe(transmitChat);
          clientAuthenticated = true;
        } else {
          logger.info('Client authentication failed.');
          // On the server I tried, I don't get the -1 packet but instead socket is closed.
          // I don't know if it is the doing of Squad server or my server provider.
          // Let's do both just in case.
          client.write(encodePacket(PacketType.AUTH_RESPONSE, -1, ''));
          client.end();
        }
      }
    }

    const writeQueue: (Promise<Buffer<ArrayBuffer>> | Buffer<ArrayBuffer>)[] = [];

    // Doc "Also note that requests executed asynchronously can possibly send their responses out of order[1]"
    // Not sure if I understand the Valve's doc right, at some part it say packet are ordered
    // and elsewhere it says they might be out of order...
    //
    // Update: It seems like this is a difference between Source RCON and Factorio RCON.
    //
    // Not sure how Squad RCON behaves but receiving an empty packet before receiving all packet responses for that same id
    // would not work (if you receive an empty packet first, how many response packets do you wait for?).
    // So the Factorio addition makes no sense for me, in regard of multi-packet responses.
    //
    // The proxy itself will be ordered.
    async function writeLoop() {
      while(client.writable) {
        if (writeQueue.length > 0) {
          // We check the length just above.
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const packetOrPromise = writeQueue.shift()!;
          if (packetOrPromise instanceof Promise) {
            // Await the pending execute.
            const actualPacket = await packetOrPromise;
            write(actualPacket);
          } else {
            write(packetOrPromise);
          }
        } else {
          // Wait one tick.
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
    }


    function write(encodedPacket: Buffer<ArrayBuffer>) {
      if (logger.level === 'trace') {
        logger.trace(`Sending packet: ${bufToHexString(encodedPacket)}`);
        const squadJSdecoded = decodePacketSquadJS(encodedPacket);
        logger.trace(`SquadJS will receive: ${util.inspect(squadJSdecoded)}`)
      }
      client.write(encodedPacket);
    }

    // Pair by id the request (e.g., ListPlayers) with the packet marking end of multi-packet response.
    // So it can send them in the proper order (which is expected by the client).
    // Moreover, "end of multi-packet response" packet, mirror whatever was sent, this include the type,
    // Valve's spec say that we should send an empty body packet of type SERVERDATA_RESPONSE_VALUE,
    // but SquadJS is sending EXEC_COMMAND instead, which is supported by Squad server.
    //
    // This particularity makes that we don't know in advance what would be the type of the packet
    // in response to the empty packet sent after each EXEC_COMMAND. (which would greatly simplify the code!)
    // So that we can both support proxying SquadJS, SquadTS, and maybe other tools that have the
    // same quirk. We need to await the empty packet sent by client to that we can respond with the correct type.
    //
    // Ok... so additionally, since SquadJS place two different variables into id:
    // - SquadJS count === id in SquadTS and Valve's doc
    // - SquadJS id = special value indicating end of multi-packet response (MID_PACKET_ID and END_PACKET_ID)
    //
    // What happens is that SquadTS see two different id and doesn't match response and request, when
    // SquadJS see the same id (named count in squadJS) but with a different marker (named id in SquadJS).
    // There is no sure way to know if the id we receive is from SquadJS special format or from SquadTS or another tool.
    //
    // Alternative... would be to send the packets directly to Squad RCON, and directly back to client,
    // While providing...  different id, to not conflict with SquadTS ids.

    // todo name of function may be confusing !
    function onAuthData(packet: Packet) {
      if (logger.level === 'trace') {
        logger.trace(`Receiving packet: ${util.inspect(packet)}`);
      }

      // Reminder:
      // Doc "One common workaround is for the client to send an empty SERVERDATA_RESPONSE_VALUE packet after every SERVERDATA_EXECCOMMAND request."
      // https://developer.valvesoftware.com/wiki/Source_RCON_Protocol
      // However SquadJS send EXEC_COMMAND with empty body.
      //
      // MOREOVER, here, rcon.execute is async, and response packet ends up being
      // written AFTER the "empty packet indicating the end of multi-packet response".
      // This breaks the specs. When trying this out, communication between SquadTS and SquadJS
      // locally is much faster than between SquadTS and the squad server (not locally hosted).
      // Meaning we receive and respond to the empty packet before responding to initial request.
      // This sends packets out of order!
      if (packet.type === PacketType.EXEC_COMMAND && packet.body.length > 0) {
        logger.trace(`Executing command: ${packet.body}`);

        try {
          const packetPromise = rcon
            // Not sure how to fix that. Safe to do as execute param and packet.body are string.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .execute(packet.body as any, true)
            .then<Buffer<ArrayBuffer>>(res => {
              logger.trace(`Response: ${res}`);
              const resPacket = encodePacket(
                PacketType.RESPONSE_VALUE,
                packet.id,
                res
              );

              // We allow the packet to be bigger than Valve's doc.
              // This avoids us the task of cutting the packet into multiple ones.
              //
              // Note: UDP limit seem to be 65507, TCP is much higher 64KB
              // net.Socket use TCP, we likely never reach a limit that is a problem.
              // But to be safe, keep this warning, if nothing bad happens after this warning,
              // that means we can safely remove it. (after a long period of testing)
              if (resPacket.length > MAXIMUM_PACKET_RESPONSE_SIZE) {
                logger.warn('Response is too long, monitor to see if packet request > 4096 are ok for client.');
              }

              return resPacket;
            });
          // It is async but we want to preserve order of packet, like if each packet was handled synchronously.
          writeQueue.push(packetPromise);
        } catch (err) {
          // If promises get rejected while in process of disconnect, we could ignore them.
          // Until then, at least warn.
          logger.warn(`Error while executing command: ${err}`);
        }
        return;
      }

      // Reminder:
      // I'll say it again: SquadJS does not follow Valve doc by sending empty packets
      // acting as end of multi-packet response, however, Squad server doesn't mind and
      // will mirror the response, type included.
      // As explained before, sending end of multi-packet response needs to be done in order.
      // and rcon.execute is async.

      // I initially expected only packet.type === PacketType.RESPONSE_VALUE
      // to have empty response, but facts have proved mirrored response happens for any packet type.
      if (packet.body.length === 0) {
        logger.trace('Empty packet received.');

        // Mirror response, sent AFTER the exec packet as per doc!
        const mirror = encodePacket(
          packet.type,
          packet.id,
          // When sending a RESPONSE_VALUE, you are not supposed to send data in it.
          // So we won't mirror that. SquadJS do not send data either as far as I know.
          ''
        );
        // "follow response" body sent after an empty RESPONSE_VALUE by the protocol. (UE4 RCON)
        // SquadJS check the body for exactly this bellow.
        // In the end, we want a packet to look like this:
        // 0a 00 00 00 00 00 00 00 00 00 00 00 00 00 00 01 00 00 00 00 00
        // Instead of a simple empty body:
        // 0a 00 00 00 00 00 00 00 00 00 00 00 00 00
        //
        // Or better explained:
        // 0a 00 00 00 00 00 00 00 00 00 00 00       00 00 00 01 00 00 00       00 00
        // 0a 00 00 00 00 00 00 00 00 00 00 00                                  00 00
        // (shown for id and type 0 above)
        //
        // How does this change from Valve's doc?
        // https://developer.valvesoftware.com/wiki/Source_RCON_Protocol doc
        // show 0x0000 0001 0000 0000, which would be 00 00 00 00 01 00 00 00 (one extra 00 at the start)
        // UE4 RCON only send 00 00 00 01 00 00 00.
        const asciiString = String.fromCharCode(
          0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00
        );
        // Follow response, that is always sent after a mirror, type is also mirrored on Squad servers.
        const follow = encodePacket(
          PacketType.RESPONSE_VALUE,
          packet.id,
          asciiString
        );
        // write the wrong value of 10, when it actually is 17, following UE4 RCON.
        follow.writeInt32LE(10, 0);

        writeQueue.push(mirror);
        writeQueue.push(follow);
        return;
      }

      // What packet could it be?
      // Auth and Chat type are handled before this function
      // It could be a RESPONSE_VALUE packet with a filled body,
      // why would you send that?
      // It could also be a new type of packet after a Squad update.
      // Whatever it is, we don't want to be silent about it.
      logger.warn(`Unhandled packet received: ${util.inspect(packet)}`)
    }

    // todo, may display pwd in logs
    const packetDataHandler = usePacketDataHandler(logger, onPacket);

    function onPacket(packet: Packet) {
      if (!clientAuthenticated) {
        onNonAuthData(packet);
      } else {
        if (logger.level === 'trace') {
          const encoded = encodePacket(packet.type, packet.id, packet.body);
          logger.trace(`Receiving (authenticated) data:\nSquadJS: ${util.inspect(decodePacketSquadJS(encoded))}\nSquadTS: ${util.inspect(packet)}`);
        }
        onAuthData(packet);
      }
    }

    // Handle incoming data from the client
    // Auth and Exec packets exepected.
    // IMPORTANT: TCP may merge multiple packets sent into one data,
    // Meaning we could have response followed by the empty body packet into one data.
    // Which give the confusing packet body: ListSquads\x00\x00\n\x00\x00\x00\x02\x00\x01\x00\x02\x00\x00\x00
    // with bytes behind ListSquads being 14 long (size of empty body packet)
    // ---> Good thing that logic has been extracted into re-usable packetDataHandler.
    client.on('data', packetDataHandler.onData);

    // Log disconnections
    client.on('end', () => {
      logger.info('Client disconnected from the RCON proxy.');
      // end maybe be called if the password is wrong.
      subChat?.unsubscribe();
      client.end();
      packetDataHandler.cleanUp();
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client.on('error', (error: any) => {
      if (error?.code === 'ECONNRESET') {
        logger.warn('Client connection reset (ECONNRESET)');
      } else {
        logger.error(`Client error: ${error?.message}`);
        console.error(error);
      }
      // If error at auth, subChat will not have been set.
      subChat?.unsubscribe();
      client.destroy();
      packetDataHandler.cleanUp();
    })

    // Start the writeLoop, writeLoop will close by itself when client is not writable anymore.
    writeLoop();
  });
  // todo test disconnect and reconnect squadJS, should not error SquadTS.


  // Start listening for incoming client connections
  server.listen(options.port, () => {
    logger.info(`RCON passthrough proxy running on port ${options.port}.`);
  });

  return {
    cleanup: () => {
      logger.info('Shutting down RCON proxy...');
      server.close();
    }
  };
}

function decodePacketSquadJS(packet: Buffer) {
  return {
    size: packet.readUInt32LE(0),
    id: packet.readUInt8(4),
    count: packet.readUInt16LE(6),
    type: packet.readUInt32LE(8),
    body: packet.toString('utf8', 12, packet.byteLength - 2),
  };
}
