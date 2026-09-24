
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

  it('fails all pending work when the bridge disconnects', async () => {
    const bridge=new StudioBridgeQueue({timeoutMs:1000});
    const pending=bridge.dispatch('get_logs',{filter:'errors'});
    bridge.failAll('connector offline');
    await expect(pending).rejects.toThrow(/connector offline/);
    expect(bridge.status()).toEqual({queued:0,pending:0});
  });
});
