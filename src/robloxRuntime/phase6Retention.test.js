import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const telemetry=readFileSync(
  new URL('../../roblox/src/server/PrivatePlaytestTelemetryService.luau',import.meta.url),
  'utf8'
);
const client=readFileSync(
  new URL('../../roblox/src/client/CoreGameLoop.client.luau',import.meta.url),
  'utf8'
);

describe('Phase 6: private retention instrumentation',()=>{
  it('measures findability, loop completion, and voluntary repeat play',()=>{
    expect(telemetry).toContain('StarBloxPrivateRetention_v1');
    expect(telemetry).toContain('firstStationSeconds');
    expect(telemetry).toContain('firstActivityId');
    expect(telemetry).toContain('activityOpenOrder');
    expect(telemetry).toContain('firstLoopSeconds');
    expect(telemetry).toContain('secondLoopStarted');
    expect(telemetry).toContain('secondLoopCompleted');
    expect(telemetry).toContain('fullLoopSessions');
    expect(telemetry).toContain('repeatLoopSessions');
    expect(telemetry).toContain('totalFirstStationSeconds');
    expect(telemetry).toContain('firstActivityCounts');
  });

  it('preserves the privacy boundary and records question identity without raw answers',()=>{
    expect(telemetry).toContain('questionIds = {}');
    expect(telemetry).toContain('storesUsername = false');
    expect(telemetry).toContain('storesUserId = false');
    expect(telemetry).toContain('storesRawAnswers = false');
    expect(telemetry).toContain('storesChat = false');
    expect(telemetry).toContain('storesSessionIds = false');
    expect(client).toContain('questionId = activity.questionId');
    expect(client).not.toContain('activity.answer');
  });
});
