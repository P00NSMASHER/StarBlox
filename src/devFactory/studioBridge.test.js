
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
    const pending=bridge.dispatch('search_tree',{query:'Quest'},{instanceId:'studio-a'});

    const work=bridge.take({instanceId:'studio-a'});
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
      instanceId:'studio-a'
    });

    await expect(adapter.call('publish_place',{})).rejects.toThrow(/unknown Studio tool/);
  });

  it('fails all pending work when the bridge disconnects', async () => {
    const bridge=new StudioBridgeQueue({timeoutMs:1000});
    const pending=bridge.dispatch('get_logs',{filter:'errors'});
    bridge.failAll('connector offline');
    await expect(pending).rejects.toThrow(/connector offline/);
    expect(bridge.status()).toEqual({queued:0,pending:0});
  });
});
