import { EndMatchVoteOptions } from './end-match-vote.config';
import { afterAll, beforeAll, describe, expect, it, MockedFunction, vi } from 'vitest';
import {
  setRconMock,
  TestServer,
  useTestServer,
} from '../../src/plugin-test-helper/plugin-test-helper';
import { Rcon } from '../../src/rcon/rcon';

describe('EndMatchVote', () => {
  let testBed: TestServer;
  const rconExec: MockedFunction<Rcon['execute']> = vi.fn();

  beforeAll(async () => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
    });
  });

  afterAll(async () => {
    vi.useRealTimers();
    await testBed.server.unwatch();
  });

  it(
    'should handle end match vote flow',
    async () => {
      // Three players
      setRconMock(rconExec, {
        ListPlayers: `----- Active Players -----
ID: 0 | Online IDs: EOS: player1 steam: 76561198016942011 | Name: Player1 | Team ID: 1 | Squad ID: N/A | Is Leader: False | Role: Rifleman
ID: 1 | Online IDs: EOS: player2 steam: 76561198016942022 | Name: Player2 | Team ID: 1 | Squad ID: N/A | Is Leader: False | Role: Rifleman
ID: 2 | Online IDs: EOS: player3 steam: 76561198016942033 | Name: Player3 | Team ID: 1 | Squad ID: N/A | Is Leader: False | Role: Rifleman
----- Recently Disconnected Players [Max of 15] -----
`,
      });

      const pluginConfig: EndMatchVoteOptions = {
        enabled: true,
        loggerVerbosity: 'debug',
        nextCommand: ['!next', '!end'],
        continueCommand: '!continue',
        broadcastMessages: {
          voteStarted: 'Vote started. Type %nextCommand% to end or %continueCommand% to continue.',
          voteUpdated: 'Votes: %votes%/%total% (%percentage%%) - Time: %remainingTime%',
          nextWin: 'Match ending! Votes: %votes%/%total% (%percentage%%)',
          continueWin: 'Match continues. Votes: %votes%/%total% (%percentage%%)',
        },
        nextVoteWait: 15,
        nextVoteWaitWarn: 'Wait %remainingNextVoteWait%',
        voteUpdateInterval: 60,
        voteDuration: 5,
        voteThresholdPercentage: 65,
      };

      testBed = await useTestServer({
        executeFn: rconExec as Rcon['execute'],
        pluginOptionOverride: {
          'end-match-vote': pluginConfig,
        },
      });

      // Player1 starts vote
      testBed.rcon.chatPacketEvent.next(
        '[ChatTeam] [Online IDs:EOS: player1 steam: 76561198016942011] Player1 : !next'
      );

      // Should broadcast the start message
      expect(rconExec).toHaveBeenCalledWith(
        'AdminBroadcast Vote started. Type !next to end or !continue to continue.'
      );

      // Wait for the first update interval
      await vi.advanceTimersByTimeAsync(60000);

      // Should broadcast update (1/3 votes = 33%)
      expect(rconExec).toHaveBeenCalledWith('AdminBroadcast Votes: 1/3 (33%) - Time: 4 minutes');

      // Player2 votes to end
      testBed.rcon.chatPacketEvent.next(
        '[ChatTeam] [Online IDs:EOS: player2 steam: 76561198016942022] Player2 : !end'
      );

      // Player3 votes to end (reaching threshold: 3/3 = 100% > 65%)
      testBed.rcon.chatPacketEvent.next(
        '[ChatTeam] [Online IDs:EOS: player3 steam: 76561198016942033] Player3 : !next'
      );

      // Should broadcast win message
      expect(rconExec).toHaveBeenCalledWith('AdminBroadcast Match ending! Votes: 3/3 (100%)');

      // Wait for 10 seconds
      await vi.advanceTimersByTimeAsync(10000);

      // Should end match
      expect(rconExec).toHaveBeenCalledWith('AdminEndMatch');

      // Clear previous calls
      rconExec.mockClear();

      // Try to start new vote immediately (should be blocked by wait time)
      testBed.rcon.chatPacketEvent.next(
        '[ChatTeam] [Online IDs:EOS: player1 steam: 76561198016942011] Player1 : !next'
      );

      // Should warn about wait time
      expect(rconExec).toHaveBeenCalledWith('AdminWarn "player1" Wait 15 minutes');

      // Simulate map change (new game event)
      testBed.emitLogs(
        '[2025.01.27-21.50.48:212][280]LogWorld: Bringing World /Game/Maps/Sumari/Gameplay_Layers/Sumari_Seed_v1.Sumari_Seed_v1 up for play (max tick rate 50) at 2025.02.27-14.50.08'
      );

      // Should allow a new vote after the map change
      testBed.rcon.chatPacketEvent.next(
        '[ChatTeam] [Online IDs:EOS: player1 steam: 76561198016942011] Player1 : !next'
      );

      // Should broadcast the start message for a new vote
      expect(rconExec).toHaveBeenCalledWith(
        'AdminBroadcast Vote started. Type !next to end or !continue to continue.'
      );

      // Player1 changes mind
      testBed.rcon.chatPacketEvent.next(
        '[ChatTeam] [Online IDs:EOS: player1 steam: 76561198016942011] Player1 : !continue'
      );

      // Wait for vote duration
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);

      // Should broadcast continue win (0/3 = 0% < 65%)
      expect(rconExec).toHaveBeenCalledWith('AdminBroadcast Match continues. Votes: 0/3 (0%)');
    },
    { timeout: 10000 }
  );
});
