import { SquadTSPlugin } from '../../src/plugin-loader/plugin.interface';
import { SquadNameValidatorOptions } from './squad-name-validator.config';
import { Squad } from '../../src/cached-game-status/use-cached-game-status';

const squadNameValidator: SquadTSPlugin<SquadNameValidatorOptions> = async (
  server,
  connectors,
  logger,
  options
) => {
  async function checkSquads(squads: Squad[]) {
    for (const squad of squads) {
      // If include any word from mustContain
      const valid = options.mustContain.some(word =>
        squad.name.toLowerCase().includes(word.toLowerCase())
      );
      if (!valid) {
        // const leader = server.helpers.getPlayersInSquad(squad.teamID, squad.squadIndex).find(p => p.isLeader)

        // Please note that the creator may not be the leader, but since RCON ListSquads run every 5 sec, and you are supposed
        // to have SquadTS run from the beginning of the match, it should not be an issue.
        // (no need to await those calls)
        server.rcon.warn(
          squad.creator.eosID,
          options.warnMessage.replaceAll('%mustContain%', options.mustContain.join(', '))
        );
        server.rcon.disbandSquad(squad.teamID, squad.squadIndex);
      }
    }
  }

  const sub = server.squad$.subscribe(checkSquads);

  // once at start.
  checkSquads(server.squads);

  return async () => {
    sub.unsubscribe();
  };
};

export default squadNameValidator;
