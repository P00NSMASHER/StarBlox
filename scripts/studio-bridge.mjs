
import http from 'node:http';

import { StudioBridgeQueue } from '../src/devFactory/studioBridge.js';

function arg(name,def=null){
  const inline=process.argv.find(value => value.startsWith(name + '='));
  if(inline) return inline.slice(name.length + 1);
  const index=process.argv.indexOf(name);
  if(index >= 0 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')){
    return process.argv[index + 1];
  }
  return def;
}

const port=Number(arg('--port',process.env.STARBLOX_STUDIO_BRIDGE_PORT || 38473));
const host=arg('--host',process.env.STARBLOX_STUDIO_BRIDGE_HOST || '127.0.0.1');
const token=arg('--token',process.env.STARBLOX_STUDIO_BRIDGE_TOKEN || '');
const LOOPBACK=new Set(['127.0.0.1','localhost','::1']);
if(!LOOPBACK.has(host) && !token){
  throw new Error('Non-loopback Studio bridge bindings require --token or STARBLOX_STUDIO_BRIDGE_TOKEN.');
}
const bodyLimit=16 * 1024 * 1024;
const bridge=new StudioBridgeQueue({
  timeoutMs:Number(process.env.STARBLOX_STUDIO_TOOL_TIMEOUT_MS || 120_000)
});

async function readJson(req){
  const chunks=[];
  let size=0;
  for await(const chunk of req){
    size+=chunk.length;
    if(size > bodyLimit) throw new Error('request body exceeds 16 MiB');
    chunks.push(chunk);
  }
  if(chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function send(res,status,payload){
  const body=JSON.stringify(payload);
  res.writeHead(status,{
    'content-type':'application/json; charset=utf-8',
    'content-length':Buffer.byteLength(body),
    'cache-control':'no-store'
  });
  res.end(body);
}

const server=http.createServer(async (req,res) => {
  try{
    const url=new URL(req.url || '/','http://' + (req.headers.host || host));
    if(token && req.headers['x-starblox-bridge-token'] !== token){
      send(res,401,{ok:false,error:'unauthorized'});
      return;
    }

    if(req.method === 'GET' && url.pathname === '/health'){
      send(res,200,{
        ok:true,
        service:'starblox-studio-bridge',
        ...bridge.status()
      });
      return;
    }

    if(req.method === 'POST' && url.pathname === '/call'){
      const body=await readJson(req);
      if(typeof body.tool !== 'string' || !body.tool){
        send(res,400,{ok:false,error:'tool is required'});
        return;
      }
      try{
        const result=await bridge.dispatch(
          body.tool,
          body.args || {},
          {
            instanceId:body.instanceId || 'default',
            target:body.target || 'edit'
          }
        );
        send(res,200,{ok:true,result});
      }catch(error){
        send(res,502,{
          ok:false,
          error:error instanceof Error ? error.message : String(error)
        });
      }
      return;
    }

    if(req.method === 'POST' && url.pathname === '/poll'){
      const body=await readJson(req);
      const instanceId=typeof body.instanceId === 'string' && body.instanceId
        ? body.instanceId
        : 'default';
      const role=typeof body.role === 'string' && body.role ? body.role : 'edit';
      const waitMs=Math.max(0,Math.min(30_000,Number(body.waitMs ?? 20_000)));
      const limit=Math.max(1,Math.min(20,Number(body.limit ?? 5)));

      await bridge.waitForWork({instanceId,role,waitMs});
      send(res,200,{
        ok:true,
        calls:bridge.take({instanceId,role,limit})
      });
      return;
    }

    if(req.method === 'POST' && url.pathname === '/result'){
      const body=await readJson(req);
      if(typeof body.id !== 'string' || !body.id){
        send(res,400,{ok:false,error:'id is required'});
        return;
      }
      const resolved=bridge.resolve(body.id,body.ok === true,body.result);
      if(!resolved){
        send(res,404,{ok:false,error:'tool call is no longer pending'});
        return;
      }
      send(res,200,{ok:true});
      return;
    }

    send(res,404,{ok:false,error:'not found'});
  }catch(error){
    send(res,400,{
      ok:false,
      error:error instanceof Error ? error.message : String(error)
    });
  }
});

server.listen(port,host,() => {
  console.log('StarBlox Studio bridge listening on http://' + host + ':' + port);
});

function shutdown(){
  bridge.failAll('Studio bridge shutting down');
  server.close(() => process.exit(0));
}

process.on('SIGINT',shutdown);
process.on('SIGTERM',shutdown);
