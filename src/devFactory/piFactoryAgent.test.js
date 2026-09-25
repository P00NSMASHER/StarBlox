import { describe,expect,it } from 'vitest';
import {
  contextWithoutRawImage,
  extractAgentJson,
  factoryRolePrompt,
  rgbaCaptureToPng,
  validateFactoryAgentResult
} from './piFactoryAgent.js';

describe('Pi factory agent contract',()=>{
  it('extracts plain and fenced JSON responses',()=>{
    expect(extractAgentJson('{"ok":true}')).toEqual({ok:true});
    expect(extractAgentJson('```json\n{"verdict":"pass"}\n```'))
      .toEqual({verdict:'pass'});
  });

  it('rejects dangerous code actions',()=>{
    expect(()=>validateFactoryAgentResult('code',{
      summary:'bad',
      actions:[{tool:'delete_instance',args:{path:'Workspace'}}]
    })).toThrow(/unsupported mutation tool/);

    expect(validateFactoryAgentResult('code',{
      summary:'bounded',
      actions:[{tool:'set_property',args:{path:'Workspace/Test',property:'Anchored',value:true}}]
    }).actions).toHaveLength(1);
  });

  it('restricts planner inspection tools',()=>{
    expect(()=>validateFactoryAgentResult('plan',{
      summary:'bad',
      inspectionCalls:[{tool:'run_luau',args:{}}],
      acceptance:[]
    })).toThrow(/unsupported inspection tool/);
  });

  it('converts RGBA screenshots into PNG bytes and removes raw image from text context',()=>{
    const rgba=Buffer.from([
      255,0,0,255,
      0,255,0,255,
      0,0,255,255,
      255,255,255,255
    ]);
    const capture={format:'rgba8',width:2,height:2,dataB64:rgba.toString('base64')};
    const png=rgbaCaptureToPng(capture);
    expect([...png.slice(0,8)]).toEqual([137,80,78,71,13,10,26,10]);
    expect(contextWithoutRawImage({capture}).capture.dataB64).toBe('[attached-as-image]');
  });

  it('provides strict JSON role prompts',()=>{
    expect(factoryRolePrompt('visual-review')).toMatch(/screenshot image/i);
    expect(factoryRolePrompt('code')).toMatch(/Never return delete_instance/);
  });
});
