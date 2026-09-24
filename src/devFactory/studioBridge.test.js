
import { afterEach,describe,expect,it,vi } from 'vitest';
import {
  StudioBridgeQueue,
  createStudioHttpAdapter
} from './studioBridge.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Step 2: Studio bridge transport', () => {
  it('queues a tool call and resolves it from a Studio poll/result cycle', async () => {
    const bridge=new StudioBridgeQueue({timeoutMs:1000});
    const pending=bridge.dispatch('search_tree',{query:'Quest'},{instanceId:'studio-a',target:'edit'});

    const work=bridge.take({instanceId:'studio-a',role:'edit'});
    expect(work).toHaveLength(1);
    expect(work[0].tool).toBe('search_tree');
    expect(work[0].args).toEqual({query:'Quest'});

    expect(bridge.resolve(work[0].id,true,{count:1})).toBe(true);
    await expect(pending).resolves.toEqual({count:1});
    expect(bridge.status()).toEqual({queued:0,pending:0});
  });

  it('registers deterministic Studio peer capability attestations', () => {
    const bridge=new StudioBridgeQueue();

    bridge.registerPeer({
      instanceId:'studio-a',
      role:'edit',
      connectorVersion:'starblox-studio-connector-v1',
      tools:['read_script','search_tree','unknown_tool','search_tree']
    });
    bridge.registerPeer({
      instanceId:'studio-b',
      role:'server',
      connectorVersion:'starblox-studio-connector-v1',
      tools:['get_logs']
    });

    expect(bridge.peerStatus({instanceId:'studio-a'})).toEqual([{
      instanceId:'studio-a',
      role:'edit',
      connectorVersion:'starblox-studio-connector-v1',
      tools:['read_script','search_tree']
    }]);
    expect(bridge.peerStatus()).toHaveLength(2);
  });

  it('expires Studio peer attestations when the connector stops polling', () => {
    let now=1_000;
    const bridge=new StudioBridgeQueue({
      peerTtlMs:30_000,
      now:() => now
    });
    bridge.registerPeer({
      instanceId:'studio-a',
      role:'edit',
      connectorVersion:'starblox-studio-connector-v1',
      tools:['search_tree']
    });

    expect(bridge.peerStatus({instanceId:'studio-a'})).toHaveLength(1);
    now+=30_001;
    expect(bridge.peerStatus({instanceId:'studio-a'})).toEqual([]);
    expect(bridge.peerStatus()).toEqual([]);
  });

  it('rejects unknown tools before they enter the bridge queue', async () => {
    const bridge=new StudioBridgeQueue();
    await expect(
      bridge.dispatch('publish_place',{placeId:123})
    ).rejects.toThrow(/unknown Studio tool/);
    expect(bridge.status()).toEqual({queued:0,pending:0});
  });

  it('sends the optional shared token without exposing unsupported tool names', async () => {
    const fetchMock=vi.fn(async (_url,options) => ({
      ok:true,
      status:200,
      async json(){
        return {ok:true,result:{count:2}};
      },
      options
    }));
    vi.stubGlobal('fetch',fetchMock);

    const adapter=createStudioHttpAdapter({
      baseUrl:'http://127.0.0.1:38473',
      instanceId:'studio-a',
      token:'shared-secret'
    });

    expect(adapter.has('search_tree')).toBe(true);
    expect(adapter.has('publish_place')).toBe(false);

    await expect(adapter.call('search_tree',{query:'NPC'})).resolves.toEqual({count:2});
    const [,options]=fetchMock.mock.calls[0];
    expect(options.headers['x-starblox-bridge-token']).toBe('shared-secret');
    expect(JSON.parse(options.body)).toEqual({
      tool:'search_tree',
      args:{query:'NPC'},
      instanceId:'studio-a',
      target:'edit'
    });

    await expect(adapter.call('publish_place',{})).rejects.toThrow(/unknown Studio tool/);
  });


  it('describes the connected bridge peer without relying on caller claims', async () => {
    const fetchMock=vi.fn(async (url,options) => ({
      ok:true,
      status:200,
      async json(){
        return {
          ok:true,
          service:'starblox-studio-bridge',
          peers:[{
            instanceId:'studio-a',
            role:'edit',
            connectorVersion:'starblox-studio-connector-v1',
            tools:['search_tree','read_script']
          }]
        };
      },
      url,
      options
    }));
    vi.stubGlobal('fetch',fetchMock);

    const adapter=createStudioHttpAdapter({
      instanceId:'studio-a',
      token:'shared-secret',
      supportedTools:['search_tree','read_script'],
      expectedConnectorVersion:'starblox-studio-connector-v1',
      requireAttestation:true
    });

    const description=await adapter.describe();
    expect(description.required).toBe(true);
    expect(description.expectedConnectorVersion).toBe('starblox-studio-connector-v1');
    expect(description.peers[0].tools).toEqual(['read_script','search_tree']);
    expect(fetchMock.mock.calls[0][0]).toContain('/health?instanceId=studio-a');
    expect(fetchMock.mock.calls[0][1].headers['x-starblox-bridge-token']).toBe('shared-secret');
  });

  it('removes timed-out queued work so Studio cannot execute it later', async () => {
    const bridge=new StudioBridgeQueue({timeoutMs:20});
    const pending=bridge.dispatch('write_script',{
      path:'ServerScriptService/Late',
      source:'return true'
    });

    await expect(pending).rejects.toThrow(/timed out/);
    expect(bridge.take({instanceId:'default',role:'edit'})).toEqual([]);
    expect(bridge.status()).toEqual({queued:0,pending:0});
  });

  it('keeps runtime peer routing under adapter control even if model args contain target', async () => {
    const fetchMock=vi.fn(async (_url,options) => ({
      ok:true,
      status:200,
      async json(){
        return {ok:true,result:{ok:true}};
      },
      options
    }));
    vi.stubGlobal('fetch',fetchMock);

    const adapter=createStudioHttpAdapter();
    await adapter.call('simulate_input',{actions:[],target:'edit'});
    await adapter.call('run_gameplay_assertions',{assertions:[],target:'client'});

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).target).toBe('client');
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).target).toBe('server');
  });

  it('routes runtime work only to the intended Studio peer role', async () => {
    const bridge=new StudioBridgeQueue({timeoutMs:1000});
    const serverPending=bridge.dispatch(
      'playtest_sample_state',
      {domains:['players','runtime']},
      {instanceId:'studio-a',target:'server'}
    );
    const clientPending=bridge.dispatch(
      'simulate_input',
      {actions:[{type:'key',key:'Space'}]},
      {instanceId:'studio-a',target:'client'}
    );

    expect(bridge.take({instanceId:'studio-a',role:'edit'})).toEqual([]);

    const serverWork=bridge.take({instanceId:'studio-a',role:'server'});
    expect(serverWork).toHaveLength(1);
    expect(serverWork[0].tool).toBe('playtest_sample_state');

    const clientWork=bridge.take({instanceId:'studio-a',role:'client-1'});
    expect(clientWork).toHaveLength(1);
    expect(clientWork[0].tool).toBe('simulate_input');

    bridge.resolve(serverWork[0].id,true,{playerCount:1});
    bridge.resolve(clientWork[0].id,true,{performed:1});
    await expect(serverPending).resolves.toEqual({playerCount:1});
    await expect(clientPending).resolves.toEqual({performed:1});
  });

  it('maps runtime tools to server/client targets and can advertise a connector subset', async () => {
    const fetchMock=vi.fn(async (_url,options) => ({
      ok:true,
      status:200,
      async json(){
        return {ok:true,result:{ok:true}};
      },
      options
    }));
    vi.stubGlobal('fetch',fetchMock);

    const adapter=createStudioHttpAdapter({
      supportedTools:['search_tree','playtest_sample_state','simulate_input']
    });

    expect(adapter.has('capture_viewport')).toBe(false);

    await adapter.call('playtest_sample_state',{domains:['runtime']});
    await adapter.call('simulate_input',{actions:[]});

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).target).toBe('server');
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).target).toBe('client');
  });

  it('rejects invalid role targets and invalid advertised connector tools', async () => {
    const bridge=new StudioBridgeQueue();

    await expect(
      bridge.dispatch('search_tree',{}, {target:'production'})
    ).rejects.toThrow(/invalid Studio target/);

    expect(() => createStudioHttpAdapter({
      supportedTools:['search_tree','publish_place']
    })).toThrow(/unknown supported Studio tool/);

    expect(() => createStudioHttpAdapter({
      targets:{search_tree:'production'}
    })).toThrow(/invalid Studio target mapping/);
  });

  it('fails all pending work when the bridge disconnects', async () => {
    const bridge=new StudioBridgeQueue({timeoutMs:1000});
    const pending=bridge.dispatch('get_logs',{filter:'errors'});
    bridge.failAll('connector offline');
    await expect(pending).rejects.toThrow(/connector offline/);
    expect(bridge.status()).toEqual({queued:0,pending:0});
  });
});
