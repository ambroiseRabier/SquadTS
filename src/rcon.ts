import { z } from "zod";
import net from 'net';
import util from 'util';


const SERVERDATA_EXECCOMMAND = 0x02;
const SERVERDATA_RESPONSE_VALUE = 0x00;
const SERVERDATA_AUTH = 0x03;
const SERVERDATA_AUTH_RESPONSE = 0x02;
const SERVERDATA_CHAT_VALUE = 0x01;

const MID_PACKET_ID = 0x01;
const END_PACKET_ID = 0x02;

const MAXIMUM_PACKET_SIZE = 4096;

const rconOptionsSchema = z.object({
  host: z.string().min(1, "Host is required"),
  port: z.number().int().positive("Port must be a positive integer"),
  password: z.string().default(""),
  autoReconnectDelay: z
    .number()
    .min(1000, "AutoReconnectDelay minimum is 1000ms") // don't DOS yourself
    .nonnegative("AutoReconnectDelay must be a non-negative number")
    .default(5000),
});

export type RconOptions = z.infer<typeof rconOptionsSchema>;



export class Rcon {
  private options: RconOptions;
  private client: net.Socket;
  private incomingData: Buffer<ArrayBuffer> = Buffer.from([]);
  private autoReconnect: boolean = false;
  private callbackIds: { id: number; cmd: string; }[] = [];
  private incomingResponse: Packet[] = [];
  private connected: boolean = false;
  private loggedin: boolean = false;
  private responseCallbackQueue: ((response: Packet|Error) => void)[] = [];
  private count: number = 1;

  constructor(options: RconOptions) {
    // Throw on fail
    this.options = rconOptionsSchema.parse(options);
    
    // Setup socket
    this.client = new net.Socket();
    this.client.on('data', this.decodeData);
    this.client.on('close', this.onClose);
    this.client.on('error', this.onError);

    // Internal variables
    // ... todo ?
  }


  private onClose(errorMessage: string) {
    this.connected = false;
    this.loggedin = false;
    // Logger.verbose(
    //   'RCON',
    //   1,
    //   `Socket closed ${errorMessage ? 'with' : 'without'} an error. ${errorMessage}`
    // );

    // Cleanup all local state onClose
    if (this.incomingData.length > 0) {
      // Logger.verbose('RCON', 2, `Clearing Buffered Data`);
      this.incomingData = Buffer.from([]);
    }
    if (this.incomingResponse.length > 0) {
      // Logger.verbose('RCON', 2, `Clearing Buffered Response Data`);
      this.incomingResponse = [];
    }
    if (this.responseCallbackQueue.length > 0) {
      // Logger.verbose('RCON', 2, `Clearing Pending Callbacks`);

      // Cleanup Pending Callbacks; We should maybe retry these on next connection
      // However, depending on the reason we got disconnected it may be a while.
      // IE, Squad server crash, Squad server shutdown for multiple minutes.

      while (this.responseCallbackQueue.length > 0) {
        this.responseCallbackQueue.shift()(new Error('RCON DISCONNECTED'));
      }
      this.callbackIds = [];
    }

    if (this.autoReconnect) {
      // Logger.verbose('RCON', 1, `Sleeping ${this.autoReconnectDelay}ms before reconnecting.`);
      setTimeout(this.connect, this.options.autoReconnectDelay);
    }
  }


  private onError() {
    // Logger.verbose('RCON', 1, `Socket had error:`, err);
    // todo: emit ou pas.
    // this.emit('RCON_ERROR', err);
  }

  private onPacket(decodedPacket: Packet) {
    // the logic in this method simply splits data sent via the data event into packets regardless of how they're
    // distributed in the event calls
    // Logger.verbose(
    //   'RCON',
    //   2,
    //   `Processing decoded packet: ${this.decodedPacketToString(decodedPacket)}`
    // );

    switch (decodedPacket.type) {
      case SERVERDATA_RESPONSE_VALUE:
      case SERVERDATA_AUTH_RESPONSE:
        switch (decodedPacket.id) {
          case MID_PACKET_ID:
            this.incomingResponse.push(decodedPacket);

            break;
          case END_PACKET_ID:
            this.callbackIds = this.callbackIds.filter((p) => p.id !== decodedPacket.count);

            this.responseCallbackQueue.shift()(
              this.incomingResponse.map((packet) => packet.body).join()
            );
            this.incomingResponse = [];

            break;
          default:
            // Logger.verbose(
            //   'RCON',
            //   1,
            //   `Unknown packet ID ${decodedPacket.id} in: ${this.decodedPacketToString(
            //     decodedPacket
            //   )}`
            // );
            this.onClose('Unknown Packet');
        }
        break;

      case SERVERDATA_CHAT_VALUE:
        this.processChatPacket(decodedPacket);
        break;

      default:
        // Logger.verbose(
        //   'RCON',
        //   1,
        //   `Unknown packet type ${decodedPacket.type} in: ${this.decodedPacketToString(
        //     decodedPacket
        //   )}`
        // );
        this.onClose('Unknown Packet');
    }
  }

  private decodeData(data: Buffer<ArrayBuffer>) {
    // todo: "module" on logger
    // Logger.verbose('RCON', 4, `Got data: ${this.bufToHexString(data)}`);

    this.incomingData = Buffer.concat([this.incomingData, data]);

    while (this.incomingData.byteLength >= 4) {
      const size = this.incomingData.readInt32LE(0);
      const packetSize = size + 4;

      if (this.incomingData.byteLength < packetSize) {
        // Logger.verbose(
        //   'RCON',
        //   4,
        //   `Waiting for more data... Have: ${this.incomingData.byteLength} Expected: ${packetSize}`
        // );
        break;
      }
      const packet = this.incomingData.subarray(0, packetSize);

      // Logger.verbose('RCON', 4, `Processing packet: ${this.bufToHexString(packet)}`);
      const decodedPacket = decodePacket(packet);

      const matchCount = this.callbackIds.filter((d) => d.id === decodedPacket.count).length;

      if (
        matchCount > 0 ||
        [SERVERDATA_AUTH_RESPONSE, SERVERDATA_CHAT_VALUE].includes(decodedPacket.type)
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
          // Logger.verbose('RCON', 4, `Ignoring some data: ${this.bufToHexString(probeBuf)}`);
          continue;
        }
      }

      // We should only get this far into the loop when we are done processing packets from this onData event.
      break;
    }
  }

  private connect() {
    return new Promise<void>((resolve, reject) => {
      // Logger.verbose('RCON', 1, `Connecting to: ${this.host}:${this.port}`);

      const onConnect = async () => {
        this.client.removeListener('error', onError);
        this.connected = true;

        // Logger.verbose('RCON', 1, `Connected to: ${this.host}:${this.port}`);

        try {
          // connected successfully, now try auth...
          await this.write(SERVERDATA_AUTH, this.options.password);

          // connected and authed successfully
          this.autoReconnect = true;
          resolve();
        } catch (err) {
          reject(err);
        }
      };

      const onError = (err: any) => {
        this.client.removeListener('connect', onConnect);

        // Logger.verbose('RCON', 1, `Failed to connect to: ${this.host}:${this.port}`, err);

        reject(err);
      };

      this.client.once('connect', onConnect);
      this.client.once('error', onError);

      this.client.connect(this.options.port, this.options.host);
    });
  }

  protected execute(command: string) {
    return this.write(SERVERDATA_EXECCOMMAND, command);
  }

  private disconnect() {
    return new Promise<void>((resolve, reject) => {
      // Logger.verbose('RCON', 1, `Disconnecting from: ${this.host}:${this.port}`);

      const onClose = () => {
        this.client.removeListener('error', onError);

        // Logger.verbose('RCON', 1, `Disconnected from: ${this.host}:${this.port}`);

        resolve();
      };

      const onError = (err: any) => {
        this.client.removeListener('close', onClose);

        // Logger.verbose('RCON', 1, `Failed to disconnect from: ${this.host}:${this.port}`, err);

        reject(err);
      };

      this.client.once('close', onClose);
      this.client.once('error', onError);

      // prevent any auto reconnection happening
      this.autoReconnect = false;

      this.client.end();
    });
  }


  private write(type: number, body: string) {
    return new Promise<void>((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Not connected.'));
        return;
      }

      if (!this.client.writable) {
        reject(new Error('Unable to write to socket.'));
        return;
      }

      if (!this.loggedin && type !== SERVERDATA_AUTH) {
        reject(new Error('RCON not Logged in'));
        return;
      }

      // Logger.verbose('RCON', 2, `Writing packet with type "${type}" and body "${body}".`);

      const encodedPacket = encodePacket(
        this.count,
        type,
        type !== SERVERDATA_AUTH ? MID_PACKET_ID : END_PACKET_ID,
        body
      );

      const encodedEmptyPacket = encodePacket(this.count, type, END_PACKET_ID, '');

      if (MAXIMUM_PACKET_SIZE < encodedPacket.length) {
        reject(new Error('Packet too long.'));
        return;
      }

      const onError = (err: any) => {
        // Logger.verbose('RCON', 1, 'Error occurred. Wiping response action queue.', err);
        this.responseCallbackQueue = [];
        reject(err);
      };

      // the auth packet also sends a normal response, so we add an extra empty action to ignore it

      if (type === SERVERDATA_AUTH) {
        this.callbackIds.push({ id: this.count, cmd: body });

        this.responseCallbackQueue.push(() => {});
        this.responseCallbackQueue.push((decodedPacket: Packet) => {
          this.client.removeListener('error', onError);
          if (decodedPacket.id === -1) {
            // Logger.verbose('RCON', 1, 'Authentication failed.');
            reject(new Error('Authentication failed.'));
          } else {
            // Logger.verbose('RCON', 1, 'Authentication succeeded.');
            this.loggedin = true;
            resolve();
          }
        });
      } else {
        this.callbackIds.push({ id: this.count, cmd: body });
        this.responseCallbackQueue.push((response) => {
          this.client.removeListener('error', onError);

          if (response instanceof Error) {
            // Called from onClose()
            reject(response);
          } else {
            // Logger.verbose(
            //   'RCON',
            //   2,
            //   `Returning complete response: ${response.replace(/\r\n|\r|\n/g, '\\n')}`
            // );

            resolve(response);
          }
        });
      }

      this.client.once('error', onError);

      if (this.count + 1 > 65535) {
        this.count = 1;
      }

      // Logger.verbose('RCON', 4, `Sending packet: ${bufToHexString(encodedPacket)}`);
      this.client.write(encodedPacket);

      if (type !== SERVERDATA_AUTH) {
        // Logger.verbose(
        //   'RCON',
        //   4,
        //   `Sending empty packet: ${bufToHexString(encodedEmptyPacket)}`
        // );
        this.client.write(encodedEmptyPacket);
        this.count++;
      }
    });
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
