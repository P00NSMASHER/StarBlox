import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {
  deriveLegacySchoolBindings,
  renderLegacySchoolBindingsLuau,
} from '../robloxWorld/legacySchoolBindings.js';

let nextId = 1;
function part(path, name, x, y, z, size = [4, 4, 1]) {
  return {
    generatedName: `LBH_${String(nextId++).padStart(5, '0')}`,
    originalName: name,
    path: path.split('/'),
    cframe: {position: [x, y, z]},
    size,
  };
}

function fixture() {
  nextId = 1;
  const rows = [
    part('Workspace/WorkspaceCom/001_School/StageLight', 'StageLight', 0, 10, 0),
    part('Workspace/Model/School sighn', 'School sighn', 0, 12, -20, [1, 8, 30]),
    part('Workspace/Model/SchoolMat', 'SchoolMat', 0, 0, -14, [8, 0.1, 10]),
    part('Workspace/Model/SchoolDoorClassroom/Door', 'Door', 70, 5, 0, [6, 9.4, 0.2]),
    part('Workspace/Model/SchoolFakeFood/FakeFood/Apple', 'Apple', 74, 4, 2),
    part('Workspace/Model/SchoolFakeFood/FakeFood/Pizza', 'Pizza', 76, 4, -2),
  ];
  const rooms = [
    {door: [-35, 5, 0], desks: [-50, 0, 0], board: [-58, 4, 0]},
    {door: [0, 5, 35], desks: [0, 0, 50], board: [0, 4, 58]},
    {door: [35, 5, 0], desks: [50, 0, 0], board: [58, 4, 0]},
  ];
  for (const room of rooms) {
    rows.push(part('Workspace/Model/SchoolDoorClassroom/Door', 'Door', ...room.door, [6, 9.4, 0.2]));
    for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) {
      rows.push(part(
        'Workspace/Model/SchoolDesks/DeskMesh/Seat',
        'Seat',
        room.desks[0] + dx,
        1.5,
        room.desks[2] + dz,
        [2, 0.2, 1.2],
      ));
    }
    rows.push(part('Workspace/Model/SchoolDryBoard/Part', 'Part', ...room.board, [0.2, 5, 20]));
  }
  // A horizontally closer upper-floor frame must not bind to a ground-floor
  // desk cluster merely because its X/Z projection is nearby.
  rows.push(part('Workspace/Model/SchoolDoorClassroom/Frame', 'Frame', 48, 19, 0, [6, 10, 0.2]));
  rows.push(part('Workspace/Model/SchoolDoorClassroom/Door', 'Door', 500, 5, 500, [6, 9.4, 0.2]));
  return rows;
}

describe('legacy Brookhaven real-school bindings', () => {
  it('derives entrance, cafeteria and three classrooms from exact physical fixtures', () => {
    const result = deriveLegacySchoolBindings(fixture());
    const classBindings = Object.values(result.classes);

    expect(result.schoolBuildingId).toBe('legacy-brookhaven-school-complex');
    expect(result.entrance.sourcePath).toBe('Workspace/Model/SchoolMat');
    expect(result.cafeteria.generatedName).toBe('LBH_00004');
    expect(result.evidence.classroomRooms).toHaveLength(3);
    expect(result.evidence.classroomRooms.every((room) => room.deskCount === 4)).toBe(true);
    expect(result.evidence.classroomRooms.every((room) => room.sourcePath.endsWith('/Door'))).toBe(true);
    expect(new Set(classBindings.map((binding) => binding.generatedName)).size).toBe(3);
    expect(classBindings.every((binding) => binding.sourcePath.includes('SchoolDoorClassroom/Door'))).toBe(true);

    const luau = renderLegacySchoolBindingsLuau(result);
    expect(luau).toContain('Revision = "legacy-real-school-bindings-v2"');
    expect(luau).toContain('FallbackCampusEnabled = false');
    expect(luau).toContain('AllowFallbackSource = false');
    expect(luau).toContain('AnchorFromSourceCenter = true');
  });

  it('fails closed when a required physical role loses its source evidence', () => {
    const rows = fixture();
    expect(() => deriveLegacySchoolBindings(rows.filter((row) => !row.path.includes('SchoolFakeFood'))))
      .toThrow(/cafeteria fixtures/);
    expect(() => deriveLegacySchoolBindings(rows.filter((row) => !row.path.includes('SchoolDryBoard'))))
      .toThrow(/expected 3 fixture-backed rooms/);
    expect(() => deriveLegacySchoolBindings(rows.filter((row) => row.originalName !== 'SchoolMat')))
      .toThrow(/entrance evidence/);
  });

  it('requires verified classroom identity and post-travel proximity before attendance', () => {
    const attendance = readFileSync('roblox/src/server/SchoolAttendanceService.luau', 'utf8');
    const runtime = readFileSync('roblox/src/server/SchoolRuntimeService.luau', 'utf8');
    const generator = readFileSync('scripts/generate-legacy-brookhaven-runtime-bindings.mjs', 'utf8');

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
