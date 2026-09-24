
import { studioToolNames } from './studioToolContract.js';

export class StudioBridgeQueue {
  constructor({
    timeoutMs=120_000,
    queueLimit=100
  }={}){
    this.timeoutMs=timeoutMs;
    this.queueLimit=queueLimit;
    this.counter=0;
    this.queue=[];
    this.pending=new Map();
    this.waiters=[];
    this.peers=new Map();
  }

  _signal(){
    const waiters=this.waiters.splice(0);
    for(const waiter of waiters) waiter();
  }

  registerPeer({
    instanceId='default',
    role='edit',
    connectorVersion=null,
    tools=[]
  }={}){
    const id=String(instanceId || 'default');
    const peerRole=String(role || 'edit');
    const known=new Set(studioToolNames());
    const advertised=Array.isArray(tools)
      ? [...new Set(tools.map(String).filter(tool => known.has(tool)))].sort()
      : [];
    const record={
      instanceId:id,
      role:peerRole,
      connectorVersion:typeof connectorVersion === 'string' && connectorVersion.trim()
        ? connectorVersion.trim()
        : null,
      tools:advertised
    };
    this.peers.set(id + '||' + peerRole,record);
    return {...record,tools:[...record.tools]};
  }

  peerStatus({instanceId=null}={}){
    return [...this.peers.values()]
      .filter(peer => instanceId == null || peer.instanceId === String(instanceId))
      .map(peer => ({...peer,tools:[...peer.tools]}))
      .sort((a,b) =>
        a.instanceId.localeCompare(b.instanceId) ||
        a.role.localeCompare(b.role)
      );
  }

  async dispatch(tool,args={},{
    instanceId='default',
    target='edit'
  }={}){
    if(!studioToolNames().includes(tool)){
      throw new Error('unknown Studio tool: ' + tool);
    }
    if(!['edit','server','client','any'].includes(target)){
      throw new Error('invalid Studio target: ' + String(target));
    }
    if(this.queue.length >= this.queueLimit){
      throw new Error('Studio bridge queue is full.');
    }

    const id='sbtool-' + (++this.counter);
    const request={
      id,
      tool,
      args:JSON.parse(JSON.stringify(args ?? {})),
      instanceId,
      target,
      expiresAt:Date.now() + this.timeoutMs
    };

    return await new Promise((resolve,reject) => {
      const timer=setTimeout(() => {
        this.pending.delete(id);
        this.queue=this.queue.filter(item => item.id !== id);
        reject(new Error('Studio tool timed out: ' + tool));
      },this.timeoutMs);
      timer.unref?.();

      this.pending.set(id,{resolve,reject,timer,request});
      this.queue.push(request);
      this._signal();
    });
  }

  take({
    instanceId='default',
    role='edit',
    limit=10
  }={}){
    const out=[];
    const keep=[];

    const now=Date.now();
    for(const request of this.queue){
      if(Number.isFinite(request.expiresAt) && request.expiresAt <= now){
        const pending=this.pending.get(request.id);
        if(pending){
          clearTimeout(pending.timer);
          this.pending.delete(request.id);
          pending.reject(new Error('Studio tool expired before delivery: ' + request.tool));
        }
        continue;
      }
      const targetMatches =
        request.target === 'any' ||
        request.target === role ||
        (request.target === 'client' && String(role).startsWith('client'));
      if(out.length < limit && request.instanceId === instanceId && targetMatches){
        out.push(request);
      }else{
        keep.push(request);
      }
    }
    this.queue=keep;
    return out;
  }

  async waitForWork({
    instanceId='default',
    role='edit',
    waitMs=20_000
  }={}){
    const matches = request =>
      request.instanceId === instanceId &&
      (
        request.target === 'any' ||
        request.target === role ||
        (request.target === 'client' && String(role).startsWith('client'))
      );
    if(this.queue.some(matches)) return;

    await new Promise(resolve => {
      const timer=setTimeout(() => {
        this.waiters=this.waiters.filter(item => item !== wake);
        resolve();
      },Math.max(0,waitMs));
      timer.unref?.();

      const wake=() => {
        clearTimeout(timer);
        resolve();
      };
      this.waiters.push(wake);
    });
  }

  resolve(id,ok,result){
    const pending=this.pending.get(id);
    if(!pending) return false;

    clearTimeout(pending.timer);
    this.pending.delete(id);

    if(ok){
      pending.resolve(result);
    }else{
      const message=typeof result === 'string'
        ? result
        : JSON.stringify(result);
      pending.reject(new Error(message || 'Studio tool failed'));
    }
    return true;
  }

  failAll(reason='Studio bridge disconnected'){
    for(const [id,pending] of this.pending){
      clearTimeout(pending.timer);
      pending.reject(new Error(reason));
      this.pending.delete(id);
    }
    this.queue=[];
    this._signal();
  }

  status(){
    return {
      queued:this.queue.length,
      pending:this.pending.size
    };
  }
}

const DEFAULT_TARGETS=Object.freeze({
  playtest_sample_state:'server',
  run_gameplay_assertions:'server',
  simulate_input:'client',
  capture_viewport:'client'
});

export function createStudioHttpAdapter({
  baseUrl='http://127.0.0.1:38473',
  instanceId='default',
  token='',
  supportedTools=studioToolNames(),
  targets=DEFAULT_TARGETS,
  expectedConnectorVersion=null,
  requireAttestation=false
}={}){
  const root=String(baseUrl).replace(/\/$/,'');
  const known=new Set(studioToolNames());

  if(!Array.isArray(supportedTools)){
    throw new TypeError('supportedTools must be an array');
  }
  for(const tool of supportedTools){
    if(!known.has(tool)){
      throw new TypeError('unknown supported Studio tool: ' + tool);
    }
  }

  if(!targets || typeof targets !== 'object' || Array.isArray(targets)){
    throw new TypeError('targets must be an object');
  }
  for(const [tool,target] of Object.entries(targets)){
    if(!known.has(tool)){
      throw new TypeError('target mapping references unknown Studio tool: ' + tool);
    }
    if(!['edit','server','client','any'].includes(target)){
      throw new TypeError('invalid Studio target mapping: ' + String(target));
    }
  }

  const supported=new Set(supportedTools);
  const expected=typeof expectedConnectorVersion === 'string' && expectedConnectorVersion.trim()
    ? expectedConnectorVersion.trim()
    : null;

  function headers(){
    const out={'content-type':'application/json'};
    if(token) out['x-starblox-bridge-token']=token;
    return out;
  }

  return {
    requiresAttestation:Boolean(requireAttestation),
    expectedConnectorVersion:expected,
    supportedTools:[...supported].sort(),
    has(tool){
      return supported.has(tool);
    },
    async describe(){
      const response=await fetch(
        root + '/health?instanceId=' + encodeURIComponent(instanceId),
        {
          method:'GET',
          headers:headers()
        }
      );
      const payload=await response.json();
      if(!response.ok || payload.ok !== true){
        throw new Error(payload.error || ('Studio bridge HTTP ' + response.status));
      }
      return {
        service:String(payload.service || ''),
        instanceId,
        expectedConnectorVersion:expected,
        required:Boolean(requireAttestation),
        supportedTools:[...supported].sort(),
        peers:Array.isArray(payload.peers)
          ? payload.peers.map(peer => ({
            instanceId:String(peer?.instanceId || ''),
            role:String(peer?.role || ''),
            connectorVersion:typeof peer?.connectorVersion === 'string'
              ? peer.connectorVersion
              : null,
            tools:Array.isArray(peer?.tools)
              ? [...new Set(peer.tools.map(String))].sort()
              : []
          }))
          : []
      };
    },
    async call(tool,args={}){
      if(!supported.has(tool)) throw new Error('unknown Studio tool: ' + tool);

      const target=targets[tool] || 'edit';

      const response=await fetch(root + '/call',{
        method:'POST',
        headers:headers(),
        body:JSON.stringify({tool,args,instanceId,target})
      });
      const payload=await response.json();
      if(!response.ok || payload.ok !== true){
        throw new Error(payload.error || ('Studio bridge HTTP ' + response.status));
      }
      return payload.result;
    }
  };
}

