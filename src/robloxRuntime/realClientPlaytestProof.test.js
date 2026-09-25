import { readFileSync } from 'node:fs';
import { describe,expect,it } from 'vitest';

import {
  buildRealClientPlaytestProbeScript
} from './realClientPlaytestProof.js';

describe('Step 9: private real-client playtest telemetry', () => {
  it('records only allowlisted privacy-minimized telemetry', () => {
    const server=readFileSync(
      new URL('../../roblox/src/server/PrivatePlaytestTelemetryService.luau',import.meta.url),
      'utf8'
    );

    for(const eventName of [
      'client_ready',
      'onboarding_shown',
      'onboarding_dismissed',
      'activity_panel_opened',
      'wrong_feedback_seen',
      'success_feedback_seen',
      'station_opened',
      'answer_wrong',
      'answer_correct',
      'loop_completed'
    ]){
      expect(server).toContain(eventName);
    }

    expect(server).toContain('storesUsername = false');
    expect(server).toContain('storesUserId = false');
    expect(server).toContain('storesRawAnswers = false');
    expect(server).toContain('storesChat = false');
    expect(server).not.toContain('player.Name');
    expect(server).not.toContain('player.UserId');
  });

  it('proves the actual core-loop LocalScript emits mobile and UI evidence', () => {
    const client=readFileSync(
      new URL('../../roblox/src/client/CoreGameLoop.client.luau',import.meta.url),
      'utf8'
    );

    expect(client).toContain('UserInputService.TouchEnabled');
    expect(client).toContain('workspace.CurrentCamera');
    expect(client).toContain('client_ready');
    expect(client).toContain('onboarding_shown');
    expect(client).toContain('onboarding_dismissed');
    expect(client).toContain('activity_panel_opened');
    expect(client).toContain('wrong_feedback_seen');
    expect(client).toContain('success_feedback_seen');
    expect(client).not.toContain('choice = currentActivity.choices[index],\n\t\t\t})\n\t\tend)\n\n\t\tsendPlaytestTelemetry');
  });

  it('correlates authoritative server milestones with the private telemetry service', () => {
    const bootstrap=readFileSync(
      new URL('../../roblox/src/server/Bootstrap.luau',import.meta.url),
      'utf8'
    );
    const loop=readFileSync(
      new URL('../../roblox/src/server/CoreGameLoopService.luau',import.meta.url),
      'utf8'
    );

    expect(bootstrap).toContain('PrivatePlaytestTelemetryService.new()');
    expect(bootstrap).toContain('CoreGameLoopService.new(profiles, replicas, privatePlaytestTelemetry)');
    expect(bootstrap).toContain('privatePlaytestTelemetry:PlayerReady');
    expect(bootstrap).toContain('privatePlaytestTelemetry:PlayerRemoving');
    expect(bootstrap).toContain('privatePlaytestTelemetry:FlushAll');

    expect(loop).toContain('RecordServerEvent(player, "station_opened"');
    expect(loop).toContain('RecordServerEvent(player, "answer_wrong"');
    expect(loop).toContain('RecordServerEvent(player, "answer_correct"');
    expect(loop).toContain('RecordServerEvent(player, "loop_completed"');
  });

  it('real-client proof requires a real touch client and one full exercised loop', () => {
    const script=buildRealClientPlaytestProbeScript();
    expect(script).toContain('StarBloxPrivatePlaytestTelemetry_v1');
    expect(script).toContain('client.touchEnabled == true');
    expect(script).toContain('counts.onboarding_shown');
    expect(script).toContain('counts.wrong_feedback_seen');
    expect(script).toContain('server.answer_correct');
    expect(script).toContain('server.loop_completed');
    expect(script).toContain('storesRawAnswers == false');
    expect(script).toContain('STARBLOX_REAL_CLIENT_OK');
  });
});
