import { SquadTSPlugin } from '../../src/plugin-loader/plugin.interface';
import { EndMatchVoteOptions } from './end-match-vote.config';
import { formatDuration } from 'date-fns';

interface VoteState {
  votes: Set<string>; // Using eosID
  startTime: number;
  updateInterval: NodeJS.Timeout | null;
  endTimeout: NodeJS.Timeout | null;
}

const endMatchVote: SquadTSPlugin<EndMatchVoteOptions> = async (
  server,
  connectors,
  logger,
  options
) => {
  let currentVote: VoteState | null = null;
  let lastVoteEndTime = 0;

  const clearVoteTimers = () => {
    if (currentVote?.updateInterval) {
      clearInterval(currentVote.updateInterval);
    }
    if (currentVote?.endTimeout) {
      clearTimeout(currentVote.endTimeout);
    }
  };

  const endCurrentVote = () => {
    clearVoteTimers();
    currentVote = null;
    lastVoteEndTime = Date.now();
  };

  const calculateVoteStats = () => {
    const totalPlayers = server.players.length;
    const votes = currentVote?.votes.size ?? 0;
    const percentage = Math.floor((votes / totalPlayers) * 100);
    return { totalPlayers, votes, percentage };
  };

  const getRemainingTime = () => {
    if (!currentVote) {
      return '';
    }
    const elapsed = Date.now() - currentVote.startTime;
    const remaining = options.voteDuration * 60 * 1000 - elapsed;
    return formatDuration({ minutes: Math.floor(remaining / 60000) });
  };

  const broadcastVoteUpdate = async () => {
    if (!currentVote) {
      return;
    }

    const { totalPlayers, votes, percentage } = calculateVoteStats();
    const message = options.broadcastMessages.voteUpdated
      .replace('%votes%', votes.toString())
      .replace('%total%', totalPlayers.toString())
      .replace('%percentage%', percentage.toString())
      .replace('%remainingTime%', getRemainingTime());

    await server.rcon.broadcast(message);
  };

  const startVote = async (initiatorEosId: string) => {
    const remainingWait = lastVoteEndTime + options.nextVoteWait * 60 * 1000 - Date.now();
    if (remainingWait > 0) {
      const message = options.nextVoteWaitWarn.replace(
        '%remainingNextVoteWait%',
        formatDuration({ minutes: Math.ceil(remainingWait / (1000 * 60)) })
      );
      await server.rcon.warn(initiatorEosId, message);
      return;
    }

    // Start a new vote
    currentVote = {
      votes: new Set([initiatorEosId]),
      startTime: Date.now(),
      updateInterval: null,
      endTimeout: null,
    };

    // Broadcast initial message
    const message = options.broadcastMessages.voteStarted
      .replace('%nextCommand%', options.nextCommand[0])
      .replace('%continueCommand%', options.continueCommand);
    await server.rcon.broadcast(message);

    // Schedule updates
    currentVote.updateInterval = setInterval(
      broadcastVoteUpdate,
      options.voteUpdateInterval * 1000
    );

    // Schedule vote end
    currentVote.endTimeout = setTimeout(
      async () => {
        const { totalPlayers, votes, percentage } = calculateVoteStats();

        if (percentage >= options.voteThresholdPercentage) {
          const message = options.broadcastMessages.nextWin
            .replace('%votes%', votes.toString())
            .replace('%total%', totalPlayers.toString())
            .replace('%percentage%', percentage.toString());

          await server.rcon.broadcast(message);

          // Wait 10 seconds before ending match
          setTimeout(async () => {
            await server.rcon.execute('AdminEndMatch');
          }, 10000);
        } else {
          const message = options.broadcastMessages.continueWin
            .replace('%votes%', votes.toString())
            .replace('%total%', totalPlayers.toString())
            .replace('%percentage%', percentage.toString());

          await server.rcon.broadcast(message);
        }

        endCurrentVote();
      },
      options.voteDuration * 60 * 1000
    );
  };

  const handleVote = async (eosId: string) => {
    if (!currentVote) {
      await startVote(eosId);
      return;
    }

    // Add vote if not already voted
    if (!currentVote.votes.has(eosId)) {
      currentVote.votes.add(eosId);

      // Check if the threshold reached early
      const { totalPlayers, votes, percentage } = calculateVoteStats();
      if (percentage >= options.voteThresholdPercentage) {
        clearVoteTimers();

        const message = options.broadcastMessages.nextWin
          .replace('%votes%', votes.toString())
          .replace('%total%', totalPlayers.toString())
          .replace('%percentage%', percentage.toString());

        await server.rcon.broadcast(message);

        // Wait 10 seconds before ending the match
        setTimeout(async () => {
          await server.rcon.execute('AdminEndMatch');
        }, 10000);

        endCurrentVote();
      }
    }
  };

  // Listen for chat commands
  server.chatEvents.command.subscribe(async data => {
    if (options.nextCommand.includes(data.command)) {
      await handleVote(data.player.eosID);
    } else if (data.command === options.continueCommand && currentVote) {
      // Remove vote if exists
      currentVote.votes.delete(data.player.eosID);
    }
  });

  // Clear vote on map change
  server.events.newGame.subscribe(() => {
    if (currentVote) {
      endCurrentVote();
    }
    lastVoteEndTime = 0; // Reset wait time on map change
  });

  // Cleanup function
  return async () => {
    if (currentVote) {
      clearVoteTimers();
    }
  };
};

export default endMatchVote;
