import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('Block 4: graded schoolwork evidence hierarchy runtime seam',()=>{
  it('configures teacher-marked evidence above weaker schoolwork source classes',()=>{
    const config=read('roblox/src/shared/CoreLoopConfig.luau');

    expect(config).toContain('SchoolworkEvidenceWeight = 0.42');
    expect(config).toContain('SchoolworkEvidenceErrorShare = 0.75');
    expect(config).toContain('SchoolworkEvidencePresenceShare = 0.25');
    expect(config).toContain('SchoolworkEvidenceAttemptTarget = 3');
    expect(config).toContain('TeacherMarkedSchoolworkMultiplier = 1.0');
    expect(config).toContain('CompletedSchoolworkMultiplier = 0.65');
    expect(config).toContain('UngradedSchoolworkMultiplier = 0.35');
  });

  it('uses correctness only as bounded ranking pressure and never mutates mastery or diagnosis state',()=>{
    const priority=read('roblox/src/server/LearningPriority.luau');

    expect(priority).toContain('local function schoolworkEvidencePressure');
    expect(priority).toContain('local likelyIncorrect = math.max(0, tonumber(row.LikelyIncorrect) or 0)');
    expect(priority).toContain('local errorRate = if known > 0 then math.clamp(likelyIncorrect / known, 0, 1) else 0');
    expect(priority).toContain('return math.clamp(evidencePressure * sourceStrength * confidence, 0, 1)');
    expect(priority).toContain('schoolworkPressure * (tonumber(config.SchoolworkEvidenceWeight) or 0.42)');

    expect(priority).not.toContain('MasteredSkills[skill]');
    expect(priority).not.toContain('SpacedMasteryBySkill[skill] =');
    expect(priority).not.toContain('SkillStats[skill] =');
    expect(priority).not.toContain('Diagnosis');
  });

  it('classifies the current legacy batch as teacher-marked without inventing correctness',()=>{
    const evidence=read('roblox/src/shared/SchoolworkSkillEvidence.luau');

    expect(evidence).toContain('TeacherMarked = 3');
    expect(evidence).toContain('CompletedSchoolwork = 0');
    expect(evidence).toContain('UngradedSchoolwork = 0');
    expect(evidence).toContain('UnknownCorrectness = 3');
    expect(evidence).toContain('LikelyCorrect = 0');
    expect(evidence).toContain('LikelyIncorrect = 0');
  });

  it('keeps evidence private to server-side ranking rather than replicating it to clients',()=>{
    const replica=read('roblox/src/server/ReplicaStateService.luau');
    const profile=read('roblox/src/shared/ProfileTemplate.luau');

    expect(replica).not.toContain('SchoolworkSkillEvidence');
    expect(profile).not.toContain('SchoolworkSkillEvidence');
    expect(profile).not.toContain('LikelyIncorrect');
    expect(profile).not.toContain('TeacherMarked');
  });
});
