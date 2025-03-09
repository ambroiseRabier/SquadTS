import { afterAll, beforeAll, describe, expect, it, MockedFunction, vi } from 'vitest';
import { setRconMock, TestServer, useTestServer } from '../../src/use-test-server/use-test-server';
import { Rcon } from '../../src/rcon/use-rcon';
import { AutoRejoinOptions } from './auto-rejoin-team.config';

describe('auto-rejoin-team', () => {
  let testBed: TestServer;
  const rconExec: MockedFunction<Rcon['execute']> = vi.fn();

  beforeAll(async () => {
    vi.useFakeTimers();
  });

  afterAll(async () => {
    vi.useRealTimers();
    await testBed.server.unwatch();
  });

  it('should ', async () => {
    setRconMock(rconExec, {
      ListPlayers: `----- Active Players -----
ID: 0 | Online IDs: EOS: 0002201300c327a19a4c6ae06dc955a3 steam: 76561198000000001 | Name: Yuca | Team ID: 1 | Squad ID: N/A | Is Leader: False | Role: USA_Rifleman_01
----- Recently Disconnected Players [Max of 15] -----`,
    });

    const pluginConfig: AutoRejoinOptions = {
      enabled: true,
      loggerVerbosity: 'trace',
      message: 'You have been reassigned to the team you were on before disconnecting.',
      trackDisconnectedFor: 5,
    };

    testBed = await useTestServer({
      executeFn: rconExec as unknown as Rcon['execute'],
      pluginOptionOverride: {
        'auto-rejoin-team': pluginConfig,
      },
    });

    // Disconnecting player, it should get tracked.
    testBed.emitLogs(`
      [2025.01.27-22.05.26:087][233]LogNet: UChannel::Close: Sending CloseBunch. ChIndex == 0. Name: [UChannel] ChIndex: 0, Closing: 0 [UNetConnection] RemoteAddr: 86.208.113.0:60419, Name: EOSIpNetConnection_2130439491, Driver: GameNetDriver EOSNetDriver_2131536283, IsServer: YES, PC: BP_PlayerController_C_2130438728, Owner: BP_PlayerController_C_2130438728, UniqueId: RedpointEOS:0002201300c327a19a4c6ae06dc955a3
    `);

    // Wait half the time.
    await vi.advanceTimersByTimeAsync((pluginConfig.trackDisconnectedFor * 60 * 1000) / 2);

    rconExec.mockClear();

    // Reconnect, but team 2 this time.
    testBed.emitNewPlayerLogs({
      eosID: '0002201300c327a19a4c6ae06dc955a3',
      id: '0',
      name: 'Yuca',
      steamID: '76561198000000001',
      teamID: '2',
    });
    // Note: auto-rejoin relies on logs only, so we don't need to set RCON bellow.
    //     setRconMock(rconExec, {
    //       ListPlayers: `----- Active Players -----
    // ID: 0 | Online IDs: EOS: 0002201300c327a19a4c6ae06dc955a3 steam: 76561198000000001 | Name: Yuca | Team ID: 2 | Squad ID: N/A | Is Leader: False | Role: USA_Rifleman_01
    // ----- Recently Disconnected Players [Max of 15] -----`,
    //     });
    //     await testBed.triggerRCONUpdate();

    // Should switch to team 1 and warn.
    expect(rconExec).toHaveBeenCalledWith('AdminForceTeamChange "2"');
    await vi.advanceTimersByTimeAsync(0); // necessary to wait one tick, otherwise only first await in subscribe callback is called.
    expect(rconExec).toHaveBeenCalledWith(
      'AdminWarn "0002201300c327a19a4c6ae06dc955a3" You have been reassigned to the team you were on before disconnecting.'
    );

    // disconnect again
    testBed.emitLogs(`
      [2025.01.27-22.05.26:087][233]LogNet: UChannel::Close: Sending CloseBunch. ChIndex == 0. Name: [UChannel] ChIndex: 0, Closing: 0 [UNetConnection] RemoteAddr: 86.208.113.0:60419, Name: EOSIpNetConnection_2130439491, Driver: GameNetDriver EOSNetDriver_2131536283, IsServer: YES, PC: BP_PlayerController_C_2130438728, Owner: BP_PlayerController_C_2130438728, UniqueId: RedpointEOS:0002201300c327a19a4c6ae06dc955a3
    `);

    // Wait the full time. + 10ms offset
    await vi.advanceTimersByTimeAsync(pluginConfig.trackDisconnectedFor * 60 * 1000 + 10);

    rconExec.mockClear();

    // Reconnect, but team 2 this time (again).
    testBed.emitNewPlayerLogs({
      eosID: '0002201300c327a19a4c6ae06dc955a3',
      id: '0',
      name: 'Yuca',
      steamID: '76561198000000001',
      teamID: '2',
    });

    // Wait half the time.
    await vi.advanceTimersByTimeAsync((pluginConfig.trackDisconnectedFor * 60 * 1000) / 2);

    // Should not switch back since we "forgot" the player
    expect(rconExec).not.toHaveBeenCalledWith(expect.stringContaining('AdminForceTeamChange'));
    expect(rconExec).not.toHaveBeenCalledWith(expect.stringContaining(pluginConfig.message));
  });
});
