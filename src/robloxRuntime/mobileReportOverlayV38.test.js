import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const source=readFileSync(
  new URL('../../roblox/src/client/SchoolSystem.client.luau',import.meta.url),
  'utf8'
);

describe('v38 compact free-roam school report behavior',()=>{
  it('never auto-covers compact phone free roam with the end-of-day report',()=>{
    expect(source).toContain('compactViewport = viewport.X <= 1024 or viewport.Y <= 600');
    expect(source.match(/report\.Visible = reportAvailable and not compactViewport and not panel\.Visible and not menuOpen/g)?.length).toBe(2);
    expect(source).toContain('TODAY\'S REPORT');
    expect(source).toContain('Missed work available at the Library.');
  });
});
