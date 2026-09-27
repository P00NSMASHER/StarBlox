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
    const choiceCount=Number(client.match(/for index = 1, (\d+) do/)?.[1]);
    const buttonHeight=Number(client.match(/button.Size = UDim2.new\(1, -32, 0, (\d+)\)/)?.[1]);
    const renderQuestion=client.slice(
      client.indexOf('local function renderQuestion'),
      client.indexOf('\nfor _, button in buttons do')
    );
    const panelHeights=[...renderQuestion.matchAll(
      /panel\.Size = UDim2\.new\(0\.84, 0, 0, (\d+)\)/g
    )].map(match=>Number(match[1]));
    const choiceLayouts=[...renderQuestion.matchAll(
      /button\.Position = UDim2\.fromOffset\(16, (\d+) \+ \(\(index - 1\) \* (\d+)\)\)/g
    )].map(match=>({firstChoiceY:Number(match[1]),choiceStep:Number(match[2])}));

    expect(choiceCount).toBeGreaterThan(0);
    expect(buttonHeight).toBeGreaterThanOrEqual(44);
    expect(panelHeights).toHaveLength(2);
    expect(choiceLayouts).toHaveLength(2);
    for(let index=0;index<panelHeights.length;index++){
      const layout=choiceLayouts[index];
      const finalBottom=layout.firstChoiceY+(choiceCount-1)*layout.choiceStep+buttonHeight;
      expect(finalBottom).toBeLessThanOrEqual(panelHeights[index]);
    }
  });
});
