import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

import {
  buildLegacySchoolworkSkillObservations,
  renderSchoolworkSkillEvidenceLua
} from './schoolworkSkillObservations.js';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('checked-in schoolwork skill observation artifacts',()=>{
  it('regenerates the current JSON, receipt, and Roblox evidence module exactly',()=>{
    const source=JSON.parse(read('docs/phase6/SCHOOLWORK_PHOTO_SOURCE.json'));
    const artifact=JSON.parse(read('docs/phase6/SCHOOLWORK_SKILL_OBSERVATIONS.json'));
    const receipt=JSON.parse(read('docs/phase6/SCHOOLWORK_SKILL_OBSERVATION_RECEIPT.json'));
    const lua=read('roblox/src/shared/SchoolworkSkillEvidence.luau');

    const rebuilt=buildLegacySchoolworkSkillObservations(source);
    expect(rebuilt.issues).toEqual([]);
    expect(rebuilt.artifact).toEqual(artifact);
    expect(rebuilt.receipt).toEqual(receipt);
    expect(renderSchoolworkSkillEvidenceLua(rebuilt.artifact)).toBe(lua);
  });

  it('binds 12 sanitized observations into exactly 8 current skill buckets',()=>{
    const artifact=JSON.parse(read('docs/phase6/SCHOOLWORK_SKILL_OBSERVATIONS.json'));
    expect(artifact.observationCount).toBe(12);
    expect(Object.keys(artifact.bySkill)).toHaveLength(8);
    expect(artifact.bySkill['religion-application'].observationCount).toBe(3);
    expect(artifact.bySkill['story-elements'].observationCount).toBe(2);
    expect(artifact.bySkill['vowel-patterns'].observationCount).toBe(2);
  });
});
