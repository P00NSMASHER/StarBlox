import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {
  deriveLegacySchoolBindings,
  renderLegacySchoolBindingsLuau,
} from '../robloxWorld/legacySchoolBindings.js';

function door(index, x, z) {
  return {
    generatedName: `LBH_${String(index).padStart(5, '0')}`,
    originalName: 'SchoolDoorClassroom',
    path: ['Workspace', 'WorkspaceCom', '001_School', 'SchoolDoorClassroom'],
    cframe: {position: [x, 12, z]},
    size: [4, 8, 1],
  };
}

describe('legacy Brookhaven real-school bindings', () => {
  const coherentDoors = [
    door(101, 0, 0),
    door(102, 20, 0),
    door(103, 40, 0),
    door(104, 0, 30),
    door(105, 20, 30),
    door(106, 40, 30),
    door(107, 0, 60),
    door(108, 40, 60),
  ];

  it('maps five classes and two shared destinations to distinct real classroom doors', () => {
    const result = deriveLegacySchoolBindings(coherentDoors);
    const classBindings = Object.values(result.classes);

    expect(result.schoolBuildingId).toBe('legacy-brookhaven-school');
    expect(result.candidateDoorCount).toBe(8);
    expect(new Set(classBindings.map((binding) => binding.generatedName)).size).toBe(5);
    expect(classBindings.every((binding) => binding.sourcePath.includes('001_School/SchoolDoorClassroom'))).toBe(true);
    expect(classBindings.every((binding) => binding.physicalRoomId.startsWith('legacy-classroom-'))).toBe(true);

    const luau = renderLegacySchoolBindingsLuau(result);
    expect(luau).toContain('FallbackCampusEnabled = false');
    expect(luau).toContain('AllowFallbackSource = false');
    expect(luau).toContain('RequireVerifiedPhysicalClassrooms = true');
    expect(luau).toContain('PhysicalClassroomVerified = true');
  });

  it('ignores similarly named geometry outside the school model', () => {
    const unrelated = door(999, 500, 500);
    unrelated.path = ['Workspace', 'WorkspaceCom', '003_SchoolLockers', 'SchoolDoorClassroom'];
    const result = deriveLegacySchoolBindings([...coherentDoors, unrelated]);
    expect(result.candidateDoorCount).toBe(8);
    expect(Object.values(result.classes).every((binding) => binding.sourcePath.includes('001_School/SchoolDoorClassroom'))).toBe(true);
  });

  it('fails closed when source drift removes or spatially splits the classroom building', () => {
    expect(() => deriveLegacySchoolBindings(coherentDoors.slice(0, 6))).toThrow(/expected at least 7/);
    expect(() => deriveLegacySchoolBindings([
      ...coherentDoors.slice(0, 7),
      door(109, 900, 900),
    ])).toThrow(/cluster is incoherent/);
  });

  it('requires verified classroom identity and post-travel proximity before attendance', () => {
    const attendance = readFileSync('roblox/src/server/SchoolAttendanceService.luau', 'utf8');
    const runtime = readFileSync('roblox/src/server/SchoolRuntimeService.luau', 'utf8');
    const generator = readFileSync('scripts/generate-legacy-brookhaven-runtime-bindings.mjs', 'utf8');

    const worldConfig = readFileSync('roblox/src/shared/BrookhavenMirrorConfig.luau', 'utf8');
    expect(worldConfig).toContain('Mode = "exact-frozen-brookhaven-world"');
    expect(attendance).toContain('MirrorConfig.World.Mode == "exact-frozen-brookhaven-world"');
    expect(attendance).toContain('LegacySchoolWorldBindings');
    expect(attendance).toContain('verified school source part is missing');
    expect(attendance).toContain('function SchoolAttendanceService.ValidateClassroomAnchor');
    expect(attendance).toContain('anchor:GetAttribute("FallbackSourceUsed") == true');
    expect(runtime.match(/Attendance\.ValidateClassroomAnchor/g)).toHaveLength(2);
    expect(runtime).toContain('code = "classroom_unverified"');
    expect(runtime).toContain('code = "school_travel_incomplete"');
    expect(generator).toContain("writeFile(resolve(outDir,'LegacySchoolWorldBindings.luau'),schoolLuau)");
  });
});
