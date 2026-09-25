import { describe,expect,it } from 'vitest';
import { readFileSync } from 'node:fs';

import { parseRestrictedSerializedWorldForTest } from './serializedWorldParser.js';

const validEntry=`
-- safe data only
return {[1]={decal={transparency=0;face=Enum.NormalId.Front;texture="rbxassetid://123";};
surface={Top="Smooth";Front="Smooth";Bottom="Inlet";Right="Smooth";Left="Smooth";Back="Smooth";};
reflectance=0;color={[1]=17;[2]=18;[3]=19;};
anchored=true;mesh={offset={[1]=0;[2]=0;[3]=0;};
meshtype=Enum.MeshType.FileMesh;vertexcolor={[1]=1;[2]=1;[3]=1;};
scale={[1]=1;[2]=1;[3]=1;};meshid="http://www.roblox.com/asset/?id=456";texture="";};
cancollide=false;transparency=0;texture="SmoothPlastic";position={[1]=1;[2]=2;[3]=3;};
locked=false;cframe={[1]=1;[2]=2;[3]=3;[4]=1;[5]=0;[6]=0;[7]=0;[8]=1;[9]=0;[10]=0;[11]=0;[12]=1;};
shape="Block";size={[1]=4;[2]=5;[3]=6;};};}
`;

describe('Target architecture Step 3 restricted serialized-world parser', () => {
  it('parses only inert data tables and bounded Enum references', () => {
    const root=parseRestrictedSerializedWorldForTest(validEntry);
    expect(root.kind).toBe('table');
    expect(root.fields).toHaveLength(1);
    expect(root.fields[0].key).toBe(1);
    expect(root.fields[0].value.kind).toBe('table');
  });

  it('rejects arbitrary symbolic references and function-like syntax', () => {
    expect(() => parseRestrictedSerializedWorldForTest(
      'return {[1]=os.execute;}'
    )).toThrow(/only bounded Enum references/);

    expect(() => parseRestrictedSerializedWorldForTest(
      'return {[1]=(function() return 1 end)();}'
    )).toThrow(/unsupported token|unsupported value token/);

    expect(() => parseRestrictedSerializedWorldForTest(
      'return {[1]=loadstring;}'
    )).toThrow(/only bounded Enum references/);
  });

  it('rejects duplicate keys, nil, and unsupported string escapes', () => {
    expect(() => parseRestrictedSerializedWorldForTest(
      'return {[1]={x=1;x=2;};}'
    )).toThrow(/duplicate table key/);

    expect(() => parseRestrictedSerializedWorldForTest(
      'return {[1]=nil;}'
    )).toThrow(/nil is not allowed/);

    expect(() => parseRestrictedSerializedWorldForTest(
      'return {[1]="bad\\x";}'
    )).toThrow(/unsupported string escape/);
  });

  it('contains no JavaScript eval, Function constructor, or vm execution path', () => {
    const source=readFileSync(new URL('./serializedWorldParser.js',import.meta.url),'utf8');
    expect(source).not.toMatch(/\beval\s*\(/);
    expect(source).not.toMatch(/\bnew\s+Function\s*\(/);
    expect(source).not.toMatch(/from\s+['"]node:vm['"]/);
  });
});
