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
    expect(client).toContain('and not menuOpen');
  });
  it('keeps every answer button inside both compact question panels',()=>{
    const client=read('roblox/src/client/SchoolSystem.client.luau');
    const choiceCount=Number(client.match(/for index = 1, (\\d+) do/)?.[1]);
    const buttonHeight=Number(client.match(/button.Size = UDim2.new\\(1, -32, 0, (\\d+)\\)/)?.[1]);
    const layouts=[...client.matchAll(
      /panel\\.Size = UDim2\\.new\\(0\\.84, 0, 0, (\\d+)\\)[\\s\\S]*?for index, button in buttons do\\s+button\\.Position = UDim2\\.fromOffset\\(16, (\\d+) \\+ \\(\\(index - 1\\) \\* (\\d+)\\)\\)/g
    )].map(match=>({
      panelHeight:Number(match[1]),
      firstChoiceY:Number(match[2]),
      choiceStep:Number(match[3]),
    }));

    expect(choiceCount).toBeGreaterThan(0);
    expect(buttonHeight).toBeGreaterThanOrEqual(44);
    expect(layouts).toHaveLength(2);
    for(const layout of layouts){
      const finalBottom=layout.firstChoiceY+(choiceCount-1)*layout.choiceStep+buttonHeight;
      expect(finalBottom).toBeLessThanOrEqual(layout.panelHeight);
    }
  });

});
