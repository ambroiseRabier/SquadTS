import { Packet, Rcon } from './rcon';
import { processBody } from './chat-processor';
import { extractIDs } from './id-parser';
import { omit } from 'lodash';


/**
 * Example: "CHAT_MESSAGE" to "chat message"
 */
function convertToReadableText(input: string): string {
  return input
    .toLowerCase()
    .split('_')
    .join(' ');
}

// todo: envisager d'envoyer rcon en tant que Dep, pour le mock ds les test
export class RconSquad extends Rcon {

  protected processChatPacket(decodedPacket: Packet) {
    const processedBody = processBody(decodedPacket.body);

    if (!processedBody) {
      // Logger.warn : might be something wrong, or something new, or maybe it is by design to ignore non-match.
      return;
    }

    const {eventName, content} = processedBody;

    // Logger.verbose('SquadRcon', 2, `Matched ${convertToReadableText(eventName)}: ${decodedPacket.body}`);

    // this.emit(eventName, content);
  }

  async getCurrentMap() {
    const response = await this.execute('ShowCurrentMap');
    const match = response.match(/^Current level is (?<level>[^,]*), layer is (?<layer>[^,]*)/);
    return match!.groups!;
  }

  async getNextMap() {
    const response = await this.execute('ShowNextMap');
    const match = response.match(/^Next level is ([^,]*), layer is ([^,]*)/);
    return {
      level: match ? (match[1] !== '' ? match[1] : null) : null,
      layer: match ? (match[2] !== 'To be voted' ? match[2] : null) : null
    };
  }

  async getListPlayers() {
    const response = await this.execute('ListPlayers');

    const players: {
      playerID: number;
      isLeader: boolean;
      teamID: number|null;
      squadID: number|null;
    }[] = [];

    if (!response || response.length < 1) {
      return players;
    }

    for (const line of response.split('\n')) {
      const match = line.match(
        /^ID: (?<playerID>\d+) \| Online IDs:(?<ids>[^|]+)\| Name: (?<name>.+) \| Team ID: (?<teamID>\d|N\/A) \| Squad ID: (?<squadID>\d+|N\/A) \| Is Leader: (?<isLeader>True|False) \| Role: (?<role>.+)$/
      );
      if (!match) continue;

      const {ids, isLeader, playerID, squadID, teamID} = match.groups!;

      players.push({
        playerID: parseInt(playerID),
        isLeader: isLeader === 'True',
        teamID: teamID !== 'N/A' ? parseInt(teamID) : null,
        squadID: squadID !== 'N/A' ? parseInt(squadID) : null,
        ...extractIDs(ids)
      });
    }

    return players;
  }

  async getSquads() {
    const responseSquad = await this.execute('ListSquads');

    if (!responseSquad || responseSquad.length < 1) {
      return [];
    }

    const squadRegex = /ID: (?<squadID>\d+) \| Name: (?<squadName>.+) \| Size: (?<size>\d+) \| Locked: (?<locked>True|False) \| Creator Name: (?<creatorName>.+) \| Creator Online IDs:(?<creator_ids>[^|]+)/;

    // Using functional approach (.map) is preferred as typing can be inferred.
    return responseSquad
      .split('\n')
      .map((line) => {
        const match = line.match(squadRegex);
        const matchSide = line.match(/Team ID: (?<teamID>\d) \((?<teamName>.+)\)/);

        if (!match) {
          // same as continue in a for loop when combined with filter null bellow
          return null;
        }

        return {
          ...omit(match.groups!, 'squadID'),
          squadID: parseInt(match.groups!.squadID),
          teamID: matchSide && parseInt(matchSide.groups!.teamID),
          teamName: matchSide && matchSide.groups!.teamName,
          ...extractIDs(match.groups!.creator_ids, 'creator'),
        };
      })
      // Remove null entries
      .filter((squad): squad is NonNullable<typeof squad> => squad !== null);
  }

  async broadcast(message: string) {
    await this.execute(`AdminBroadcast ${message}`);
  }

  async setFogOfWar(mode: string) {
    await this.execute(`AdminSetFogOfWar ${mode}`);
  }

  async warn(anyID: string, message: string) {
    await this.execute(`AdminWarn "${anyID}" ${message}`);
  }

  // 0 = Perm | 1m = 1 minute | 1d = 1 Day | 1M = 1 Month | etc...
  async ban(anyID: string, banLength: string, message: string) {
    await this.execute(`AdminBan "${anyID}" ${banLength} ${message}`);
  }

  async switchTeam(anyID: string) {
    await this.execute(`AdminForceTeamChange "${anyID}"`);
  }

  async disbandSquad(teamID: string, squadID: string) {
    await this.execute(`AdminDisbandSquad ${teamID} ${squadID}`);
  }

  async kick(anyID: string, reason: string) {
    await this.execute(`AdminKick "${anyID}" ${reason}`);
  }

  async forceTeamChange(anyID: string) {
    await this.execute(`AdminForceTeamChange "${anyID}"`);
  }
}
