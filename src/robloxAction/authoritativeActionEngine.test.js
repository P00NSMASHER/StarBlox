
import { describe,expect,it } from 'vitest';
import {
  ACTION_NETCODE_VERSION,
  applyActionInput,
  applyFireIntent,
  buildActionReconciliationPlan,
  createActionNetcodeConfig,
  createActionWorld,
  sampleActionHistory
} from './authoritativeActionEngine.js';

const CONFIG={
  historyWindowMs:1000,
  maxClientLeadMs:150,
  maxClientLagMs:1200,
  maxSpeed:20,
  weapons:{
    pulse:{
      damage:25,
      cooldownMs:250,
      maxRange:100,
      hitRadius:2,
      originTolerance:3
    }
  }
};

function world(){
  return createActionWorld({
    players:[
      {playerId:'a',position:{x:0,y:0,z:0},health:100,serverTimeMs:0},
      {playerId:'b',position:{x:10,y:0,z:0},health:100,serverTimeMs:0}
    ]
  },CONFIG);
}

describe('Step 9: authoritative action input', () => {
  it('accepts only bounded movement intent and derives position on the server', () => {
    const result=applyActionInput(world(),'a',{
      seq:0,
      clientTimeMs:100,
      dtMs:50,
      moveX:1,
      moveZ:0,
      jump:false
    },{serverTimeMs:100,config:CONFIG});

    expect(result.ok).toBe(true);
    expect(result.ackSeq).toBe(0);
    expect(result.snapshot.position.x).toBeCloseTo(1,12);
    expect(result.snapshot.velocity.x).toBe(20);
    expect(result.world.players.a.position.x).toBeCloseTo(1,12);
  });

  it('rejects client-authored position, health, target, score, or damage fields', () => {
    for(const extra of ['position','health','targetId','score','damage']){
      const input={
        seq:0,clientTimeMs:100,dtMs:16,moveX:0,moveZ:0,jump:false,
        [extra]:999
      };
      const result=applyActionInput(world(),'a',input,{serverTimeMs:100,config:CONFIG});
      expect(result.ok,extra).toBe(false);
      expect(result.reason).toMatch(/non-intent fields/);
    }
  });

  it('rejects duplicate sequences, oversized movement, invalid dt, and clock abuse', () => {
    const first=applyActionInput(world(),'a',{
      seq:0,clientTimeMs:100,dtMs:16,moveX:0,moveZ:0,jump:false
    },{serverTimeMs:100,config:CONFIG});
    expect(first.ok).toBe(true);

    expect(applyActionInput(first.world,'a',{
      seq:0,clientTimeMs:116,dtMs:16,moveX:0,moveZ:0,jump:false
    },{serverTimeMs:116,config:CONFIG}).reason).toMatch(/duplicate/);

    expect(applyActionInput(world(),'a',{
      seq:0,clientTimeMs:100,dtMs:16,moveX:2,moveZ:0,jump:false
    },{serverTimeMs:100,config:CONFIG}).reason).toMatch(/magnitude/);

    expect(applyActionInput(world(),'a',{
      seq:0,clientTimeMs:100,dtMs:500,moveX:0,moveZ:0,jump:false
    },{serverTimeMs:100,config:CONFIG}).reason).toMatch(/dt/);

    expect(applyActionInput(world(),'a',{
      seq:0,clientTimeMs:500,dtMs:16,moveX:0,moveZ:0,jump:false
    },{serverTimeMs:100,config:CONFIG}).reason).toMatch(/ahead/);

    expect(applyActionInput(world(),'a',{
      seq:0,clientTimeMs:-2000,dtMs:16,moveX:0,moveZ:0,jump:false
    },{serverTimeMs:100,config:CONFIG}).reason).toMatch(/too old/);
  });

  it('keeps bounded timestamped history and linearly rewinds between snapshots', () => {
    let current=world();
    current=applyActionInput(current,'b',{
      seq:0,clientTimeMs:100,dtMs:50,moveX:1,moveZ:0,jump:false
    },{serverTimeMs:100,config:CONFIG}).world;
    current=applyActionInput(current,'b',{
      seq:1,clientTimeMs:200,dtMs:50,moveX:1,moveZ:0,jump:false
    },{serverTimeMs:200,config:CONFIG}).world;

    const pose=sampleActionHistory(current.players.b,150);
    expect(pose.position.x).toBeCloseTo(11.5,12);
  });
});

describe('Step 9: server-owned lag compensated hits', () => {
  it('rewinds target state, chooses the target on the server, and applies server weapon damage', () => {
    let current=world();

    current=applyActionInput(current,'b',{
      seq:0,clientTimeMs:100,dtMs:50,moveX:1,moveZ:0,jump:false
    },{serverTimeMs:100,config:CONFIG}).world;

    const result=applyFireIntent(current,'a',{
      requestId:'shot-1',
      weaponId:'pulse',
      shotTimeMs:100,
      origin:{x:0,y:0,z:0},
      direction:{x:1,y:0,z:0}
    },{serverTimeMs:110,config:CONFIG});

    expect(result.ok).toBe(true);
    expect(result.event.hit).toBe(true);
    expect(result.event.targetId).toBe('b');
    expect(result.event.damage).toBe(25);
    expect(result.event.targetHealth).toBe(75);
    expect(result.world.players.b.health).toBe(75);
    expect(result.event.eventHash).toMatch(/^fnv1a32:[a-f0-9]{8}$/);
  });

  it('rejects client-authored target/damage/outcome and forged origins', () => {
    const base={
      requestId:'shot-x',
      weaponId:'pulse',
      shotTimeMs:100,
      origin:{x:0,y:0,z:0},
      direction:{x:1,y:0,z:0}
    };

    for(const field of ['targetId','damage','hit','score']){
      const result=applyFireIntent(world(),'a',{...base,[field]:999},{
        serverTimeMs:100,config:CONFIG
      });
      expect(result.ok,field).toBe(false);
      expect(result.reason).toMatch(/client-authored outcome/);
    }

    const forged=applyFireIntent(world(),'a',{
      ...base,
      requestId:'forged',
      origin:{x:50,y:0,z:0}
    },{serverTimeMs:100,config:CONFIG});
    expect(forged.ok).toBe(false);
    expect(forged.reason).toMatch(/origin/);
  });

  it('enforces rewind window, future-time guard, request dedupe and server cooldown', () => {
    const base={
      weaponId:'pulse',
      origin:{x:0,y:0,z:0},
      direction:{x:1,y:0,z:0}
    };

    expect(applyFireIntent(world(),'a',{
      ...base,requestId:'old',shotTimeMs:-2000
    },{serverTimeMs:100,config:CONFIG}).reason).toMatch(/rewind history/);

    expect(applyFireIntent(world(),'a',{
      ...base,requestId:'future',shotTimeMs:400
    },{serverTimeMs:100,config:CONFIG}).reason).toMatch(/future/);

    const first=applyFireIntent(world(),'a',{
      ...base,requestId:'one',shotTimeMs:100
    },{serverTimeMs:100,config:CONFIG});
    expect(first.ok).toBe(true);

    expect(applyFireIntent(first.world,'a',{
      ...base,requestId:'one',shotTimeMs:100
    },{serverTimeMs:400,config:CONFIG}).reason).toMatch(/duplicate/);

    expect(applyFireIntent(first.world,'a',{
      ...base,requestId:'two',shotTimeMs:150
    },{serverTimeMs:150,config:CONFIG}).reason).toMatch(/cooldown/);
  });

  it('respects server world occlusion distance instead of hitting through closer geometry', () => {
    const result=applyFireIntent(world(),'a',{
      requestId:'wall',
      weaponId:'pulse',
      shotTimeMs:100,
      origin:{x:0,y:0,z:0},
      direction:{x:1,y:0,z:0}
    },{
      serverTimeMs:100,
      config:CONFIG,
      maxWorldHitDistance:5
    });

    expect(result.ok).toBe(true);
    expect(result.event.hit).toBe(false);
    expect(result.world.players.b.health).toBe(100);
  });
});

describe('Step 9: client reconciliation contract', () => {
  it('replays only inputs the authoritative snapshot has not acknowledged', () => {
    const plan=buildActionReconciliationPlan({
      authoritativeSnapshot:{
        serverTimeMs:500,
        ackSeq:3,
        position:{x:5,y:0,z:0},
        velocity:{x:1,y:0,z:0},
        health:100
      },
      pendingInputs:[
        {seq:5,moveX:1},
        {seq:2,moveX:0},
        {seq:4,moveX:1}
      ]
    });

    expect(plan.ackSeq).toBe(3);
    expect(plan.replayInputs.map(row=>row.seq)).toEqual([4,5]);
  });

  it('exposes a versioned configuration contract', () => {
    expect(ACTION_NETCODE_VERSION).toBe('starblox-action-netcode-v1');
    const cfg=createActionNetcodeConfig(CONFIG);
    expect(cfg.weapons.pulse.damage).toBe(25);
    expect(cfg.historyWindowMs).toBe(1000);
  });
});
