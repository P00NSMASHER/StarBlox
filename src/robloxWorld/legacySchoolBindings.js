const CLASS_ASSIGNMENTS = Object.freeze([
  ['reading', 'Reading', '101'],
  ['math', 'Math', '102'],
  ['word-skills', 'Word Skills', '103'],
  ['teacher-choice', "Teacher's Choice", '104'],
  ['star-lab', 'STAR Lab', '105'],
]);

function finiteVector(value, length = 3) {
  return Array.isArray(value)
    && value.length === length
    && value.every((entry) => Number.isFinite(Number(entry)));
}

function horizontalDistance(a, b) {
  return Math.hypot(a[0] - b[0], a[2] - b[2]);
}

function positionKey(position) {
  return `${Math.round(position[0] * 2)}:${Math.round(position[1] * 2)}:${Math.round(position[2] * 2)}`;
}

function luaString(value) {
  return `"${String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n')}"`;
}

function vectorLiteral(vector) {
  return `Vector3.new(${vector.map((value) => Number(value.toFixed(4))).join(', ')})`;
}

function bindingLiteral(binding, extras = '') {
  return `table.freeze({SourcePartName = ${luaString(binding.generatedName)}, HeightOffset = 2, WorldOffset = ${vectorLiteral(binding.worldOffset)}, Label = ${luaString(binding.label)}, PhysicalRoomId = ${luaString(binding.physicalRoomId)}, SourceWorldPath = ${luaString(binding.sourcePath)}, PhysicalClassroomVerified = true${extras}})`;
}

/**
 * Derive real school anchors from the pinned legacy Brookhaven classroom-door
 * models. The source has duplicate model names, so geometry identity and
 * position—not sibling-name uniqueness—form the stable key.
 */
export function deriveLegacySchoolBindings(geometry) {
  if (!Array.isArray(geometry)) throw new Error('legacy geometry rows are required');

  const doorRows = geometry.filter((row) => {
    const path = Array.isArray(row?.path) ? row.path : [];
    return path.some((segment) => /^SchoolDoorClassroom$/i.test(String(segment)))
      && /door/i.test(String(row?.originalName ?? ''))
      && typeof row?.generatedName === 'string'
      && finiteVector(row?.cframe?.position)
      && finiteVector(row?.size);
  });

  const uniqueByPosition = new Map();
  for (const row of doorRows) {
    const key = positionKey(row.cframe.position);
    const previous = uniqueByPosition.get(key);
    if (!previous || String(row.generatedName).localeCompare(String(previous.generatedName)) < 0) {
      uniqueByPosition.set(key, row);
    }
  }

  const doors = [...uniqueByPosition.values()].sort((a, b) =>
    a.cframe.position[0] - b.cframe.position[0]
    || a.cframe.position[2] - b.cframe.position[2]
    || a.cframe.position[1] - b.cframe.position[1]
    || a.generatedName.localeCompare(b.generatedName));

  if (doors.length < 7) {
    throw new Error(`verified legacy classroom doors missing: expected at least 7, found ${doors.length}`);
  }

  const centroid = [0, 1, 2].map((axis) =>
    doors.reduce((sum, row) => sum + row.cframe.position[axis], 0) / doors.length);
  const maximumSeparation = doors.reduce((maximum, row) =>
    Math.max(maximum, ...doors.map((other) => horizontalDistance(row.cframe.position, other.cframe.position))), 0);
  if (maximumSeparation > 300) {
    throw new Error(`legacy classroom-door cluster is incoherent: ${maximumSeparation.toFixed(2)} studs`);
  }

  const selected = doors.slice(0, 7).map((row, index) => {
    const position = row.cframe.position;
    const dx = centroid[0] - position[0];
    const dz = centroid[2] - position[2];
    const length = Math.hypot(dx, dz) || 1;
    return {
      generatedName: row.generatedName,
      sourcePath: row.path.join('/'),
      sourceName: row.originalName,
      position,
      worldOffset: [dx / length * 5, 0, dz / length * 5],
      physicalRoomId: `legacy-classroom-${String(index + 1).padStart(2, '0')}`,
    };
  });

  const classes = Object.fromEntries(CLASS_ASSIGNMENTS.map(([classId, label, room], index) => [classId, {
    ...selected[index],
    label,
    room,
  }]));

  return {
    schoolBuildingId: 'legacy-brookhaven-school',
    selectionBasis: 'pinned-legacy-SchoolDoorClassroom-geometry-v1',
    candidateDoorCount: doors.length,
    maximumSeparation,
    centroid,
    entrance: {...selected[0], label: 'School Entrance'},
    cafeteria: {...selected[5], label: 'Cafeteria'},
    library: {...selected[6], label: 'Library / Make-Up'},
    classes,
  };
}

export function renderLegacySchoolBindingsLuau(bindings) {
  const classRows = CLASS_ASSIGNMENTS.map(([classId]) => {
    const binding = bindings.classes[classId];
    return `\t\t[${luaString(classId)}] = ${bindingLiteral(binding, `, Room = ${luaString(binding.room)}`)},`;
  });
  return [
    '--!strict',
    '',
    '-- Generated deterministically from the pinned licensed legacy Brookhaven source.',
    '-- Classroom semantics are assigned to distinct physical classroom-door anchors.',
    'local LegacySchoolWorldBindings = table.freeze({',
    '\tSchemaVersion = 1,',
    '\tRevision = "legacy-real-school-bindings-v1",',
    '\tWorldRootName = "BrookhavenWorldRuntime",',
    '\tImmutableWitnessName = "BrookhavenWorldBaseline",',
    '\tRuntimeProjectionRequired = true,',
    '\tRuntimeAnchorFolderName = "StarBloxSchoolAnchors",',
    '\tBaselineMutationAllowed = false,',
    '\tAllowFallbackSource = false,',
    '\tFallbackCampusEnabled = false,',
    '\tRequireVerifiedPhysicalClassrooms = true,',
    `\tSchoolBuildingId = ${luaString(bindings.schoolBuildingId)},`,
    `\tSelectionBasis = ${luaString(bindings.selectionBasis)},`,
    `\tEntrance = ${bindingLiteral(bindings.entrance)},`,
    `\tCafeteria = ${bindingLiteral(bindings.cafeteria)},`,
    `\tLibrary = ${bindingLiteral(bindings.library)},`,
    '\tClasses = table.freeze({',
    ...classRows,
    '\t}),',
    '})',
    '',
    'return LegacySchoolWorldBindings',
    '',
  ].join('\n');
}
