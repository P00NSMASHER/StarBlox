
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
  }

  _signal(){
    const waiters=this.waiters.splice(0);
    for(const waiter of waiters) waiter();
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
      target
    };

    return await new Promise((resolve,reject) => {
      const timer=setTimeout(() => {
        this.pending.delete(id);
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

    for(const request of this.queue){
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
  targets=DEFAULT_TARGETS
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

  return {
    has(tool){
      return supported.has(tool);
    },
    async call(tool,args={}){
      if(!supported.has(tool)) throw new Error('unknown Studio tool: ' + tool);

      const headers={'content-type':'application/json'};
      if(token) headers['x-starblox-bridge-token']=token;

      const explicitTarget=
        typeof args?.target === 'string' && ['edit','server','client','any'].includes(args.target)
          ? args.target
          : null;
      const target=explicitTarget || targets[tool] || 'edit';

      const response=await fetch(root + '/call',{
        method:'POST',
        headers,
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

