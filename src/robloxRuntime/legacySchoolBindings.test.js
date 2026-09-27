import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {
  deriveLegacySchoolBindings,
  renderLegacySchoolBindingsLuau,
} from '../robloxWorld/legacySchoolBindings.js';

function door(index, x, z) {
  return {
    generatedName: 'LBH_' + String(index).padStart(5, '0'),
    originalName: 'Door',
    path: ['Workspace', 'Model', 'SchoolDoorClassroom', 'Door'],
    cframe: {position: [x, 5.1, z]},
    size: [6, 9.4, 0.2],
  };
}

const pinnedSchoolFixture = [
  door(11807, -321, 254),
  door(11970, -366, 225),
  door(12380, -363, 174),
  door(14137, -308, 195),
  {
    generatedName: 'LBH_11700',
    originalName: 'SchoolMat',
    path: ['Workspace', 'Model', 'SchoolMat'],
    cframe: {position: [-390, 0.65, 211]},
    size: [5, 0.1, 12],
  },
  {
    generatedName: 'LBH_12400',
    originalName: 'Pizza',
    path: ['Workspace', 'Model', 'SchoolFakeFood', 'FakeFood', 'Pizza'],
    cframe: {position: [-330, 17, 253]},
    size: [1, 0.1, 0.4],
  },
  {
    generatedName: 'LBH_12401',
    originalName: 'Apple',
    path: ['Workspace', 'Model', 'SchoolFakeFood', 'FakeFood', 'Apple'],
    cframe: {position: [-320, 17, 253]},
    size: [0.7, 0.7, 0.7],
  },
];

describe('legacy Brookhaven real-school bindings', () => {
  it('maps five scheduled subjects to four distinct source classroom doors', () => {
    const result = deriveLegacySchoolBindings(pinnedSchoolFixture);
    const classBindings = Object.values(result.classes);

    expect(result.schoolBuildingId).toBe('legacy-brookhaven-school');
    expect(result.candidateDoorCount).toBe(4);
    expect(new Set(classBindings.map((binding) => binding.generatedName)).size).toBe(4);
    expect(classBindings.every((binding) => binding.sourcePath.includes('Workspace/Model/SchoolDoorClassroom/Door'))).toBe(true);
    expect(classBindings.every((binding) => binding.physicalRoomId.startsWith('legacy-classroom-'))).toBe(true);
    expect(result.classes['star-lab'].generatedName).toBe(result.classes.reading.generatedName);
    expect(result.classes.reading.room).toBe('A');
    expect(result.classes['math'].room).toBe('B');

    const luau = renderLegacySchoolBindingsLuau(result);
    expect(luau).toContain('FallbackCampusEnabled = false');
    expect(luau).toContain('AllowFallbackSource = false');
    expect(luau).toContain('RequireVerifiedPhysicalClassrooms = true');
    expect(luau).toContain('PhysicalClassroomVerified = true');
    expect(luau).toContain('School Arrival • Room A');
    expect(luau).toContain('Make-Up Classroom • Room A');
    expect(luau).not.toContain('Library / Make-Up');
  });

  it('binds the checked-in receipt to the generated distinct-room count', () => {
    const receipt = JSON.parse(readFileSync(
      'docs/roblox-world/LEGACY_BROOKHAVEN_SCHOOL_MAPPING_RECEIPT.json',
      'utf8'
    ));
    const generated = readFileSync('roblox/src/shared/LegacySchoolWorldBindings.luau', 'utf8');
    const physicalClassrooms = new Set(
      [...generated.matchAll(/PhysicalRoomId = "(legacy-classroom-[a-z]+)"/g)]
        .map((match) => match[1])
    );

    expect(physicalClassrooms.size).toBe(4);
    expect(receipt.mappingContract.minimumDistinctPhysicalClassrooms).toBe(physicalClassrooms.size);
    expect(receipt.mappingContract.classAssignments).toBe(5);
  });

  it('grounds the class travel point beside the actual classroom door', () => {
    const result = deriveLegacySchoolBindings(pinnedSchoolFixture);
    const binding = result.classes.reading;
    const row = pinnedSchoolFixture.find((candidate) => candidate.generatedName === binding.generatedName);
    const anchorY = row.cframe.position[1] + row.size[1] / 2 + 2 + binding.worldOffset[1];
    expect(anchorY).toBeCloseTo(3.7, 4);
  });

  it('uses source food props for lunch travel instead of reusing a classroom doorway', () => {
    const result = deriveLegacySchoolBindings(pinnedSchoolFixture);
    expect(result.cafeteria.sourcePath).toContain('SchoolFakeFood');
    expect(result.cafeteria.physicalClassroomVerified).toBe(false);
    expect(result.cafeteria.physicalRoomId).toBe('legacy-school-lunch-area');
    expect(result.library.sourcePath).toContain('SchoolDoorClassroom');
  });

  it('ignores classroom-like geometry outside the real school fixture group', () => {
    const unrelated = door(999, 500, 500);
    unrelated.path = ['Workspace', 'WorkspaceCom', '003_SchoolLockers', 'SchoolDoorClassroom', 'Door'];
    const result = deriveLegacySchoolBindings([...pinnedSchoolFixture, unrelated]);
    expect(result.candidateDoorCount).toBe(4);
    expect(Object.values(result.classes).every((binding) => !binding.sourcePath.includes('003_SchoolLockers'))).toBe(true);
  });

  it('fails closed when source drift removes doors, floor, food, or building coherence', () => {
    expect(() => deriveLegacySchoolBindings(pinnedSchoolFixture.filter((row) =>
      row.originalName !== 'Door').concat(pinnedSchoolFixture.filter((row) =>
      row.originalName === 'Door').slice(0, 3)))).toThrow(/expected at least 4/);
    expect(() => deriveLegacySchoolBindings(pinnedSchoolFixture.filter((row) => row.originalName !== 'SchoolMat')))
      .toThrow(/school floor reference geometry missing/);
    expect(() => deriveLegacySchoolBindings(pinnedSchoolFixture.filter((row) => !row.path.includes('SchoolFakeFood'))))
      .toThrow(/school food-area source geometry missing/);
    expect(() => deriveLegacySchoolBindings([
      ...pinnedSchoolFixture,
      {...door(14138, 900, 900), generatedName: 'LBH_14138'},
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
