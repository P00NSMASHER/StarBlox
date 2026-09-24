
import { describe,expect,it } from 'vitest';
import { stableHash } from '../domainSchemas.js';
import {
  createDiagnosticSession,
  diagnosticSummary,
  endDiagnosticSession,
  recordDiagnosticError,
  recordDiagnosticEvent,
  recordNetworkObservation,
  recordPerformanceSnapshot,
  sanitizeDiagnosticValue,
  setDiagnosticMetadata,
  verifyDiagnosticSession
} from './sessionDiagnostics.js';

describe('Step 20: privacy-safe observability diagnostics', () => {
  it('drops sensitive metadata keys and redacts obvious secrets from nested event payloads', () => {
    let session=createDiagnosticSession({
      sessionId:'diag-1',
      startedAt:'2026-09-24T12:00:00Z',
      metadata:{
        build:'2026.09.24',
        playerEmail:'student@example.com',
        authorization:'Bearer secret-token'
      }
    });

    expect(session.metadata.build).toBe('2026.09.24');
    expect(session.metadata.playerEmail).toBeUndefined();
    expect(session.metadata.authorization).toBeUndefined();

    session=recordDiagnosticEvent(session,{
      type:'quest-error-context',
      at:'2026-09-24T12:00:05Z',
      data:{
        district:'Story Street',
        email:'kid@example.com',
        nested:{
          token:'abc123',
          message:'Contact kid@example.com or use 123456789.'
        }
      }
    });

    expect(session.events[0].data.email).toBe('[REDACTED]');
    expect(session.events[0].data.nested.token).toBe('[REDACTED]');
    expect(session.events[0].data.nested.message).toContain('[REDACTED_EMAIL]');
    expect(session.events[0].data.nested.message).toContain('[REDACTED_NUMBER]');
  });

  it('stores network diagnostics without query strings, fragments, headers, or bodies', () => {
    let session=createDiagnosticSession({
      sessionId:'diag-network',
      startedAt:'2026-09-24T12:00:00Z'
    });

    session=recordNetworkObservation(session,{
      at:'2026-09-24T12:00:01Z',
      method:'post',
      url:'https://api.example.test/v1/attempt?token=secret&answer=private#fragment',
      status:503,
      durationMs:412.4,
      responseBytes:8123,
      headers:{authorization:'Bearer secret'},
      body:{answer:'private'}
    });

    expect(session.network).toEqual([{
      at:'2026-09-24T12:00:01.000Z',
      method:'POST',
      url:'https://api.example.test/v1/attempt',
      status:503,
      durationMs:412,
      responseBytes:8123,
      failed:true
    }]);
    expect(JSON.stringify(session.network)).not.toMatch(/secret|private|authorization/i);
  });

  it('supports failures-only network capture without changing the session for successes', () => {
    const session=createDiagnosticSession({
      sessionId:'diag-failures',
      startedAt:'2026-09-24T12:00:00Z'
    });
    const next=recordNetworkObservation(session,{
      at:'2026-09-24T12:00:01Z',
      method:'GET',
      url:'/health?verbose=true',
      status:200,
      durationMs:10
    },{failuresOnly:true});

    expect(next).toBe(session);
  });

  it('throttles noisy repeated events', () => {
    let session=createDiagnosticSession({
      sessionId:'diag-throttle',
      startedAt:'2026-09-24T12:00:00Z'
    });

    for(let index=0;index<6;index++){
      session=recordDiagnosticEvent(session,{
        type:'pointer-jitter',
        at:new Date(Date.parse('2026-09-24T12:00:00Z') + index * 1000).toISOString(),
        data:{index},
        maxEvents:20,
        throttlePerType:3
      });
    }

    expect(session.events).toHaveLength(3);
    expect(session.counters.eventCount).toBe(3);
    expect(session.counters.droppedEvents).toBe(3);
    expect(session.events.map(event => event.data.index)).toEqual([0,1,2]);
  });

  it('caps retained event history while preserving total event counters', () => {
    let session=createDiagnosticSession({
      sessionId:'diag-cap',
      startedAt:'2026-09-24T12:00:00Z'
    });

    for(let index=0;index<5;index++){
      session=recordDiagnosticEvent(session,{
        type:'event-' + index,
        at:new Date(Date.parse('2026-09-24T12:00:00Z') + index * 1000).toISOString(),
        data:{index},
        maxEvents:3
      });
    }

    expect(session.events).toHaveLength(3);
    expect(session.events.map(event => event.data.index)).toEqual([2,3,4]);
    expect(session.counters.eventCount).toBe(5);
    expect(session.counters.droppedEvents).toBe(2);
  });

  it('redacts error messages/stacks and aggregates performance without raw frame streams', () => {
    let session=createDiagnosticSession({
      sessionId:'diag-errors',
      startedAt:'2026-09-24T12:00:00Z'
    });

    const error=new Error('Request failed for kid@example.com token 123456789');
    error.stack='Error: kid@example.com\n at secret 123456789';

    session=recordDiagnosticError(session,error,{
      at:'2026-09-24T12:00:02Z',
      context:{authorization:'Bearer abc',screen:'Quest'}
    });
    session=recordPerformanceSnapshot(session,{
      fps:60,
      frameMs:16,
      memoryMb:120,
      longFrames:1,
      at:'2026-09-24T12:00:03Z'
    });
    session=recordPerformanceSnapshot(session,{
      fps:30,
      frameMs:40,
      memoryMb:125,
      longFrames:2,
      at:'2026-09-24T12:00:04Z'
    });

    expect(session.errors[0].message).toContain('[REDACTED_EMAIL]');
    expect(session.errors[0].message).toContain('[REDACTED_NUMBER]');
    expect(session.errors[0].context.authorization).toBe('[REDACTED]');
    expect(session.performance.samples).toBe(2);
    expect(session.performance.avgFps).toBe(45);
    expect(session.performance.minFps).toBe(30);
    expect(session.performance.longFrames).toBe(3);
  });

  it('ends, summarizes, and detects tampering deterministically', () => {
    let session=createDiagnosticSession({
      sessionId:'diag-end',
      startedAt:'2026-09-24T12:00:00Z',
      metadata:{build:'abc'}
    });
    session=setDiagnosticMetadata(session,'dailyRelease','daily-2026-09-24@v1');
    session=endDiagnosticSession(session,{endedAt:'2026-09-24T12:30:00Z'});

    const summary=diagnosticSummary(session);
    expect(summary.metadata.dailyRelease).toBe('daily-2026-09-24@v1');
    expect(verifyDiagnosticSession(session)).toEqual({ok:true,errors:[]});

    const tampered=JSON.parse(JSON.stringify(session));
    tampered.metadata.build='forged';
    expect(verifyDiagnosticSession(tampered).ok).toBe(false);
  });

  it('exposes the sanitizer as a pure helper for external observability adapters', () => {
    expect(sanitizeDiagnosticValue({
      password:'secret',
      message:'hello student@example.com',
      rows:Array.from({length:35},(_,i) => i)
    })).toEqual({
      password:'[REDACTED]',
      message:'hello [REDACTED_EMAIL]',
      rows:Array.from({length:30},(_,i) => i)
    });
  });
});
