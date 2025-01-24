import { z } from "zod";
import net from 'net';
import util from 'util';
import { Logger } from "pino";


enum DataType {
  EXEC_COMMAND = 0x02,
  RESPONSE_VALUE = 0x00,
  AUTH = 0x03,
  AUTH_RESPONSE = 0x02,
  CHAT_VALUE = 0x01
}

// 1 => "CHAT_VALUE"
function getEnumKeyByValue(value: number): string | undefined {
  return Object.keys(DataType).find(
    (key) => DataType[key as keyof typeof DataType] === value
  );
}

const MID_PACKET_ID = 0x01;
const END_PACKET_ID = 0x02;

const MAXIMUM_PACKET_SIZE = 4096;

const ipRegex = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/;

export const rconOptionsSchema = z.object({
  host: z
    .string()
    .min(1, "Host is required")
    .regex(ipRegex, "Invalid IPv4")
    .describe("The IP of the server."),
  port: z
    .number()
    .int()
    .positive("Port must be a positive integer")
    .default(21114)
    .describe("The RCON port of the server."),
  password: z
    .string()
    .describe("The RCON password of the server."),
  autoReconnectDelay: z
    .number()
    .nonnegative("AutoReconnectDelay must be a non-negative number")
    .min(1000, "AutoReconnectDelay minimum is 1000ms") // don't DOS yourself
    .default(5000),
});

export type RconOptions = z.infer<typeof rconOptionsSchema>;



export class Rcon {
  private client: net.Socket;
  private incomingData: Buffer<ArrayBuffer> = Buffer.from([]);
  private autoReconnect: boolean = false;
  private callbackIds: { id: number; cmd: string; }[] = [];
  private incomingResponse: Packet[] = [];
  private connected: boolean = false;
  private loggedin: boolean = false;
  private responseCallbackQueue: ((response: Packet|Error|string) => void)[] = [];
  private count: number = 1;

  constructor(
    private options: RconOptions,
    private logger: Logger)
  {
    const opt = rconOptionsSchema.safeParse(options);

    if (!opt.success) {
      const errorMessages = opt.error.issues.map(
        (issue) => `  - ${issue.path.join('.')}: ${issue.message}`
      ).join('\n');

      logger.error(`Invalid RCON options:\n${errorMessages}`);

      throw new Error(); // todo: propagate options error and watch file ?
    } else {
      this.options = opt.data;
    }

    // Setup socket
    this.client = new net.Socket();
    this.client.on('data', this.decodeData.bind(this));
    this.client.on('close', this.onClose.bind(this));
    this.client.on('error', this.onError.bind(this));

    // Internal variables
    // ... todo ?
  }


  private onClose(errorMessage: string) {
    this.connected = false;
    this.loggedin = false;
    this.logger.error(`Socket closed ${errorMessage ? 'with' : 'without'} an error. ${errorMessage}`);

    // Cleanup all local state onClose
    if (this.incomingData.length > 0) {
      this.logger.debug(`Clearing Buffered Data`);
      this.incomingData = Buffer.from([]);
    }
    if (this.incomingResponse.length > 0) {
      this.logger.debug(`Clearing Buffered Response Data`);
      this.incomingResponse = [];
    }
    if (this.responseCallbackQueue.length > 0) {
      this.logger.debug(`Clearing Pending Callbacks`);

      // Cleanup Pending Callbacks; We should maybe retry these on next connection
      // However, depending on the reason we got disconnected it may be a while.
      // IE, Squad server crash, Squad server shutdown for multiple minutes.

      while (this.responseCallbackQueue.length > 0) {
        this.responseCallbackQueue.shift()!(new Error('RCON DISCONNECTED'));
      }
      this.callbackIds = [];
    }

    if (this.autoReconnect) {
      this.logger.info(`Sleeping ${this.options.autoReconnectDelay}ms before reconnecting.`)
      setTimeout(this.connect.bind(this), this.options.autoReconnectDelay);
    }
  }


  private onError(err: any) {
    this.logger.error(`Socket error: ${err}`);
    // todo: emit ou pas.
    // this.emit('RCON_ERROR', err);
  }

  private onPacket(decodedPacket: Packet) {
    // the logic in this method simply splits data sent via the data event into packets regardless of how they're
    // distributed in the event calls
    this.logger.debug(`Processing decoded packet: ${decodedPacketToString(decodedPacket)}`)

    switch (decodedPacket.type) {
      // https://developer.valvesoftware.com/wiki/Source_RCON_Protocol#SERVERDATA_AUTH_RESPONSE
      // When the server receives an auth request, it will respond with an empty SERVERDATA_RESPONSE_VALUE, followed immediately by a SERVERDATA_AUTH_RESPONSE indicating whether authentication succeeded or failed.
      case DataType.RESPONSE_VALUE:
      case DataType.AUTH_RESPONSE:
        switch (decodedPacket.id) {
          case MID_PACKET_ID:
            this.incomingResponse.push(decodedPacket);

            break;
          case END_PACKET_ID:
            this.callbackIds = this.callbackIds.filter((p) => p.id !== decodedPacket.count);

            // probably need to log that stuff
            // Todo responseCallbackQueue having string is probably something to refactor. What is the intention here?
            // We added callbacks to the queue when the request was sent. responseCallbackQueue will not be empty
            // OKay so i understand now, doc say we need to pair response with auth request, so this is sending back
            // the response to the writeAuth
            // we should refactor that after confirming I havent broken anything else in between.
            this.responseCallbackQueue.shift()!(
              this.incomingResponse.map((packet) => {
                if (packet instanceof Error) {
                  // todo
                  // Logger.error
                }

                return (packet as Packet).body;
              }).join()
            );
            this.incomingResponse = [];

            break;
          default:
            this.logger.warn(`Unknown packet ID ${decodedPacket.id} in: ${decodedPacketToString(decodedPacket)}`);
            this.onClose('Unknown Packet');
        }
        break;

      case DataType.CHAT_VALUE:
        this.processChatPacket(decodedPacket);
        break;

      default:
        this.logger.warn(`Unknown packet type ${decodedPacket.type} in: ${decodedPacketToString(decodedPacket)}`)
        this.onClose('Unknown Packet');
    }
  }

  private decodeData(data: Buffer<ArrayBuffer>) {
    this.logger.trace(`Got data: ${bufToHexString(data)}`);

    this.incomingData = Buffer.concat([this.incomingData, data]);

    while (this.incomingData.byteLength >= 4) {
      const size = this.incomingData.readInt32LE(0);
      const packetSize = size + 4;

      if (this.incomingData.byteLength < packetSize) {
        this.logger.trace(`Waiting for more data... Have: ${this.incomingData.byteLength} Expected: ${packetSize}`);
        break;
      }
      const packet = this.incomingData.subarray(0, packetSize);

      this.logger.trace(`Got packet: ${bufToHexString(packet)}`);
      const decodedPacket = decodePacket(packet);

      const matchCount = this.callbackIds.filter((d) => d.id === decodedPacket.count).length;

      if (
        matchCount > 0 ||
        [DataType.AUTH_RESPONSE, DataType.CHAT_VALUE].includes(decodedPacket.type)
      ) {
        this.onPacket(decodedPacket);
        this.incomingData = this.incomingData.subarray(packetSize);
        continue;
      }
      // The packet following an empty packet will report to be 10 long (14 including the size header bytes), but in
      // it should report 17 long (21 including the size header bytes). Therefore, if the packet is 10 in size
      // and there's enough data for it to be a longer packet then we need to probe to check it's this broken packet.
      const probePacketSize = 21;

      if (size === 10 && this.incomingData.byteLength >= 21) {
        // copy the section of the incoming data of interest
        const probeBuf = this.incomingData.subarray(0, probePacketSize);
        // decode it
        const decodedProbePacket = decodePacket(probeBuf);
        // check whether body matches
        if (decodedProbePacket.body === '\x00\x00\x00\x01\x00\x00\x00') {
          // it does so it's the broken packet
          // remove the broken packet from the incoming data
          this.incomingData = this.incomingData.subarray(probePacketSize);
          this.logger.trace(`Removing broken packet: ${bufToHexString(probeBuf)}`);
          continue;
        }
      }

      // We should only get this far into the loop when we are done processing packets from this onData event.
      break;
    }
  }

  public connect() {
    return new Promise<void>((resolve, reject) => {
      this.logger.info(`Connecting to ${this.options.host}:${this.options.port}`);

      const onConnect = async () => {
        this.client.removeListener('error', onError);
        this.connected = true;

        this.logger.info(`Connected to ${this.options.host}:${this.options.port}`);

        try {
          // connected successfully, now try auth...
          await this.writeAuth(this.options.password);

          // connected and authed successfully
          this.autoReconnect = true;
          resolve();
        } catch (err) {
          reject(err);
        }
      };

      const onError = (err: any) => {
        this.client.removeListener('connect', onConnect);

        this.logger.error(`Failed to connect to ${this.options.host}:${this.options.port}`, err);

        reject(err);
      };

      this.client.once('connect', onConnect);
      this.client.once('error', onError);

      this.client.connect(this.options.port, this.options.host);
    });
  }

  public execute(command: string) {
    return this.write(DataType.EXEC_COMMAND, command);
  }

  public disconnect() {
    return new Promise<void>((resolve, reject) => {
      this.logger.info(`Disconnecting from ${this.options.host}:${this.options.port}`);

      const onClose = () => {
        this.client.removeListener('error', onError);

        this.logger.info(`Disconnected from ${this.options.host}:${this.options.port}`);

        resolve();
      };

      const onError = (err: any) => {
        this.client.removeListener('close', onClose);

        this.logger.error(`Failed to disconnect from ${this.options.host}:${this.options.port}`, err);

        reject(err);
      };

      this.client.once('close', onClose);
      this.client.once('error', onError);

      // prevent any auto reconnection happening
      this.autoReconnect = false;

      this.client.end();
    });
  }

  private writeAuth(password: string) {
    const type = DataType.AUTH;
    return new Promise<void>(
      (resolve, reject) => {
        if (!this.connected) {
          reject(new Error('Not connected.'));
          return;
        }

        if (!this.client.writable) {
          reject(new Error('Unable to write to socket.'));
          return;
        }

        // todo: not sure displaying password is a good idea.
        // Logger.verbose('RCON', 2, `Writing packet with type "${getEnumKeyByValue(type)}" and body "${body}".`);

        const encodedPacket = encodePacket(
          this.count,
          type,
          END_PACKET_ID,
          password
        );

        if (MAXIMUM_PACKET_SIZE < encodedPacket.length) {
          reject(new Error('Packet too long.'));
          return;
        }

        const onError = (err: any) => {
          this.logger.error('Error occurred. Wiping response action queue.', err);
          this.responseCallbackQueue = [];
          reject(err);
        };

        // the auth packet also sends a normal response, so we add an extra empty action to ignore it
        this.callbackIds.push({ id: this.count, cmd: password });
        this.responseCallbackQueue.push(() => {});
        this.responseCallbackQueue.push((decodedPacket) => {
          this.client.removeListener('error', onError);

          // todo: probably something to refactor here
          // This probably should not happen, there probably some more refactor to be done thx to TS
          if (decodedPacket instanceof Error) {
            // Todo log error
            // Logger.error ...
            this.logger.error('decodePacket is an ERROR, unknown how to handel', decodedPacket);
          }
          // force for TS, we'll ignore for now as this code currently work
          decodedPacket = decodedPacket as any as Packet;

          // https://developer.valvesoftware.com/wiki/Source_RCON_Protocol#SERVERDATA_AUTH_RESPONSE
          // "If auth failed, -1"
          if (decodedPacket.id === -1) {
            this.logger.error('Authentication failed.');
            reject(new Error('Authentication failed.'));
          } else {
            this.logger.info('Authentication succeeded.');
            this.loggedin = true;
            resolve();
          }
        });

        this.client.once('error', onError);

        if (this.count + 1 > 65535) {
          this.count = 1;
        }

        // todo password visible inside the packet, bad idea?
        // Logger.verbose('RCON', 4, `Sending packet: ${bufToHexString(encodedPacket)}`);
        this.client.write(encodedPacket);
      });
  }


  private write(type: Exclude<DataType, DataType.AUTH>, body: string) {
    return new Promise(
      (resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Not connected.'));
        return;
      }

      if (!this.client.writable) {
        reject(new Error('Unable to write to socket.'));
        return;
      }

      if (!this.loggedin) {
        reject(new Error('RCON not Logged in'));
        return;
      }

      this.logger.debug(`Writing packet with type "${getEnumKeyByValue(type)}" and body "${body}".`);

      const encodedPacket = encodePacket(
        this.count,
        type,
        MID_PACKET_ID,
        body
      );

      const encodedEmptyPacket = encodePacket(this.count, type, END_PACKET_ID, '');

      if (MAXIMUM_PACKET_SIZE < encodedPacket.length) {
        reject(new Error('Packet too long.'));
        return;
      }

      const onError = (err: any) => {
        this.logger.error('Error occurred. Wiping response action queue.', err);
        this.responseCallbackQueue = [];
        reject(err);
      };

      this.callbackIds.push({ id: this.count, cmd: body });
      this.responseCallbackQueue.push((response) => {
        this.client.removeListener('error', onError);

        if (response instanceof Error) {
          // todo: this needs to go...
          // Called from onClose()
          reject(response);
        } else {
          this.logger.debug(`Returning response: ${(response as string).replace(/\r\n|\r|\n/g, '\\n')}`);

          // todo same here, I suppose this is a string at this point, some refactor to be done with responseCallbackQueue
          resolve(response as string);
        }
      });

      this.client.once('error', onError);

      if (this.count + 1 > 65535) {
        this.count = 1;
      }

      this.logger.trace(`Sending packet: ${bufToHexString(encodedPacket)}`);
      this.client.write(encodedPacket);

      this.logger.trace(`Sending empty packet: ${bufToHexString(encodedEmptyPacket)}`);
      this.client.write(encodedEmptyPacket);
      this.count++;
    }) as Promise<string>; // todo: temp fix
  }


  protected processChatPacket(decodedPacket: Packet) {}
}

export type Packet = ReturnType<typeof decodePacket>;

function decodePacket(packet: Buffer) {
  return {
    size: packet.readUInt32LE(0),
    id: packet.readUInt8(4),
    count: packet.readUInt16LE(6),
    type: packet.readUInt32LE(8),
    body: packet.toString('utf8', 12, packet.byteLength - 2)
  };
}

function encodePacket(count: number, type: number, id: number, body: string, encoding: BufferEncoding = 'utf8') {
  const size = Buffer.byteLength(body) + 14;
  const buf = Buffer.alloc(size);

  buf.writeUInt32LE(size - 4, 0);
  buf.writeUInt8(id, 4);
  buf.writeUInt8(0, 5);
  buf.writeUInt16LE(count, 6);
  buf.writeUInt32LE(type, 8);
  buf.write(body, 12, size - 2, encoding);
  buf.writeUInt16LE(0, size - 2);

  return buf;
}

function bufToHexString(buf: Buffer<ArrayBuffer>) {
  // Note: I dunno if/how buf.toString('hex').match(/../g) === null should be handled.
  return buf.toString('hex').match(/../g)!.join(' ');
}

function decodedPacketToString(decodedPacket: Packet) {
  return util.inspect(decodedPacket, { breakLength: Infinity });
}
