import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('Block 3: schoolwork skill observations feed learning priority',()=>{
  it('ships aggregate current-skill evidence without raw schoolwork content',()=>{
    const evidence=read('roblox/src/shared/SchoolworkSkillEvidence.luau');

    expect(evidence).toContain('Version = "schoolwork-skill-observations-v1"');
    expect(evidence).toContain('BatchId = "schoolwork-2026-09-26-001"');
    for(const skill of [
      'cvc-structure',
      'genre',
      'inference',
      'plural-nouns',
      'religion-application',
      'story-elements',
      'vocabulary-in-context',
      'vowel-patterns'
    ]){
      expect(evidence).toContain('["'+skill+'"] = table.freeze({');
    }
    expect(evidence).toContain('function SchoolworkSkillEvidence.HasSkill(skill: string): boolean');
    expect(evidence).not.toContain('studentResponse');
    expect(evidence).not.toContain('teacherMark');
    expect(evidence).not.toContain('rawText');
    expect(evidence).not.toContain('worksheetText');
    expect(evidence).not.toContain('imageHash');
  });

  it('adds schoolwork presence to the existing current-material priority term only',()=>{
    const priority=read('roblox/src/server/LearningPriority.luau');

    expect(priority).toContain('require(ReplicatedStorage.StarBlox.SchoolworkSkillEvidence)');
    expect(priority).toContain('SchoolworkSkillEvidence.HasSkill(skill)');
    expect(priority).toContain('CurrentMaterialWeight');
    expect(priority).not.toContain('SchoolworkSkillEvidence.Skills[skill].LikelyCorrect');
    expect(priority).not.toContain('SchoolworkSkillEvidence.Skills[skill].LikelyIncorrect');
  });

  it('keeps schoolwork evidence server-side and out of the replicated player projection',()=>{
    const replica=read('roblox/src/server/ReplicaStateService.luau');
    const profile=read('roblox/src/shared/ProfileTemplate.luau');

    expect(replica).not.toContain('SchoolworkSkillEvidence');
    expect(replica).not.toContain('SchoolworkSkillObservations');
    expect(profile).not.toContain('SchoolworkSkillEvidence');
    expect(profile).not.toContain('SchoolworkSkillObservations');
  });

  it('keeps legacy correctness unknown instead of fabricating teacher-mark outcomes',()=>{
    const evidence=read('roblox/src/shared/SchoolworkSkillEvidence.luau');

    expect(evidence).toContain('UnknownCorrectness = 3');
    expect(evidence).toContain('LikelyCorrect = 0');
    expect(evidence).toContain('LikelyIncorrect = 0');
    expect(evidence).toContain('MeanConfidence = 0.5');
  });
});
