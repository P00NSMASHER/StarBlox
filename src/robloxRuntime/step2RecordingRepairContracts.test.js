import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const read=(file)=>readFileSync(new URL('../../'+file,import.meta.url),'utf8');

describe('recorded StarBlox repair contracts',()=>{
  it('reacquires the player camera without replaying a stale wall-occluded frame',()=>{
    const source=read('roblox/src/client/HomeCams.client.luau');
    expect(source).toContain('camera.CameraSubject = humanoid or savedCameraSubject or camera.CameraSubject');
    expect(source).not.toContain('camera.CFrame = savedCFrame');
  });
  it('only shows a compact school invitation for an unfinished period',()=>{
    const server=read('roblox/src/server/SchoolRuntimeService.luau');
    const client=read('roblox/src/client/SchoolSystem.client.luau');
    expect(server).toContain('payload.currentClassCompleted = period ~= nil and period.Status == "completed"');
    expect(server).toContain('if player.Parent ~= nil then self:_sendState(player) end');
    expect(client).toContain('calloutConstraint.MaxSize = Vector2.new(330, 60)');
    expect(client).toContain('and state.currentClassCompleted ~= true');
    expect(client).toContain('and not townMenuOpen()');
  });
});
