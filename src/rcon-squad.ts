import { Packet, Rcon } from './rcon';


export class RconSquad extends Rcon {


  protected processChatPacket(decodedPacket: Packet) {
    const matchChat = decodedPacket.body.match(
      /\[(ChatAll|ChatTeam|ChatSquad|ChatAdmin)] \[Online IDs:([^\]]+)\] (.+?) : (.*)/
    );
    if (matchChat) {
      Logger.verbose('SquadRcon', 2, `Matched chat message: ${decodedPacket.body}`);

      const result = {
        raw: decodedPacket.body,
        chat: matchChat[1],
        name: matchChat[3],
        message: matchChat[4],
        time: new Date()
      };
      iterateIDs(matchChat[2]).forEach((platform, id) => {
        result[lowerID(platform)] = id;
      });
      this.emit('CHAT_MESSAGE', result);
      return;
    }

    const matchPossessedAdminCam = decodedPacket.body.match(
      /\[Online Ids:([^\]]+)\] (.+) has possessed admin camera\./
    );
    if (matchPossessedAdminCam) {
      Logger.verbose('SquadRcon', 2, `Matched admin camera possessed: ${decodedPacket.body}`);
      const result = {
        raw: decodedPacket.body,
        name: matchPossessedAdminCam[2],
        time: new Date()
      };
      iterateIDs(matchPossessedAdminCam[1]).forEach((platform, id) => {
        result[lowerID(platform)] = id;
      });
      this.emit('POSSESSED_ADMIN_CAMERA', result);
      return;
    }

    const matchUnpossessedAdminCam = decodedPacket.body.match(
      /\[Online IDs:([^\]]+)\] (.+) has unpossessed admin camera\./
    );
    if (matchUnpossessedAdminCam) {
      Logger.verbose('SquadRcon', 2, `Matched admin camera unpossessed: ${decodedPacket.body}`);
      const result = {
        raw: decodedPacket.body,
        name: matchUnpossessedAdminCam[2],
        time: new Date()
      };
      iterateIDs(matchUnpossessedAdminCam[1]).forEach((platform, id) => {
        result[lowerID(platform)] = id;
      });
      this.emit('UNPOSSESSED_ADMIN_CAMERA', result);
      return;
    }

    const matchWarn = decodedPacket.body.match(
      /Remote admin has warned player (.*)\. Message was "(.*)"/
    );
    if (matchWarn) {
      Logger.verbose('SquadRcon', 2, `Matched warn message: ${decodedPacket.body}`);

      this.emit('PLAYER_WARNED', {
        raw: decodedPacket.body,
        name: matchWarn[1],
        reason: matchWarn[2],
        time: new Date()
      });

      return;
    }

    const matchKick = decodedPacket.body.match(
      /Kicked player ([0-9]+)\. \[Online IDs=([^\]]+)\] (.*)/
    );
    if (matchKick) {
      Logger.verbose('SquadRcon', 2, `Matched kick message: ${decodedPacket.body}`);

      const result = {
        raw: decodedPacket.body,
        playerID: matchKick[1],
        name: matchKick[3],
        time: new Date()
      };
      iterateIDs(matchKick[2]).forEach((platform, id) => {
        result[lowerID(platform)] = id;
      });
      this.emit('PLAYER_KICKED', result);
      return;
    }

    const matchSqCreated = decodedPacket.body.match(
      /(?<playerName>.+) \(Online IDs:([^)]+)\) has created Squad (?<squadID>\d+) \(Squad Name: (?<squadName>.+)\) on (?<teamName>.+)/
    );
    if (matchSqCreated) {
      Logger.verbose('SquadRcon', 2, `Matched Squad Created: ${decodedPacket.body}`);
      const result = {
        time: new Date(),
        ...matchSqCreated.groups
      };
      iterateIDs(matchSqCreated[2]).forEach((platform, id) => {
        result['player' + capitalID(platform)] = id;
      });
      this.emit('SQUAD_CREATED', result);
      return;
    }

    const matchBan = decodedPacket.body.match(
      /Banned player ([0-9]+)\. \[Online IDs=([^\]]+)\] (.*) for interval (.*)/
    );
    if (matchBan) {
      Logger.verbose('SquadRcon', 2, `Matched ban message: ${decodedPacket.body}`);

      const result = {
        raw: decodedPacket.body,
        playerID: matchBan[1],
        name: matchBan[3],
        interval: matchBan[4],
        time: new Date()
      };
      iterateIDs(matchBan[2]).forEach((platform, id) => {
        result[lowerID(platform)] = id;
      });
      this.emit('PLAYER_BANNED', result);
    }

  }


  async warn(anyID: string, message: string) {
    await this.execute(`AdminWarn "${anyID}" ${message}`);
  }

  async kick(anyID: string, reason: string) {
    await this.execute(`AdminKick "${anyID}" ${reason}`);
  }

  async forceTeamChange(anyID: string) {
    await this.execute(`AdminForceTeamChange "${anyID}"`);
  }
}
