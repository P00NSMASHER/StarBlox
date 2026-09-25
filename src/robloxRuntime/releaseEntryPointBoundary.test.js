import { readFileSync } from 'node:fs';
import { describe,expect,it } from 'vitest';

describe('Target Architecture Step 6 release entrypoints',()=>{
  it('private publisher consumes the verified mounted artifact instead of rebuilding default.project.json',()=>{
    const source=readFileSync(
      new URL('../../scripts/publish-private-starblox.mjs',import.meta.url),
      'utf8'
    );
    expect(source).toContain('STARBLOX_RELEASE_GATE_RECEIPT');
    expect(source).toContain('STARBLOX_RELEASE_ARTIFACT');
    expect(source).toContain('verifyStep6ReleaseGate');
    expect(source).not.toContain('rojo');
    expect(source).not.toContain('default.project.json');
  });

  it('formal live Studio proof requires the same release gate and artifact binding',()=>{
    const source=readFileSync(
      new URL('../../scripts/verify-live-studio-playtest.mjs',import.meta.url),
      'utf8'
    );
    expect(source).toContain('Step 6 live Studio proof requires --release-gate');
    expect(source).toContain('Step 6 live Studio proof requires --artifact');
    expect(source).toContain('verifyStep6ReleaseGate');
  });
});
