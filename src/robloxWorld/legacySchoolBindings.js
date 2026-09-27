const CLASS_ASSIGNMENTS = Object.freeze([
  ['reading', 'Reading'],
  ['math', 'Math'],
  ['word-skills', 'Word Skills'],
  ['teacher-choice', "Teacher's Choice"],
  ['star-lab', 'STAR Lab'],
]);

function finiteVector(value, length = 3) {
  return Array.isArray(value) && value.length === length
    && value.every((entry) => Number.isFinite(Number(entry)));
}

function horizontalDistance(a, b) {
  return Math.hypot(a[0] - b[0], a[2] - b[2]);
}

function luaString(value) {
  return '"' + String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n') + '"';
}

function vectorLiteral(vector) {
  return 'Vector3.new(' + vector.map((value) => Number(value.toFixed(4))).join(', ') + ')';
}

function bindingLiteral(binding, extras = '') {
  return 'table.freeze({SourcePartName = ' + luaString(binding.generatedName)
    + ', HeightOffset = 2, WorldOffset = ' + vectorLiteral(binding.worldOffset)
    + ', Label = ' + luaString(binding.label)
    + ', PhysicalRoomId = ' + luaString(binding.physicalRoomId)
    + ', SourceWorldPath = ' + luaString(binding.sourcePath)
    + ', PhysicalClassroomVerified = ' + String(binding.physicalClassroomVerified === true)
    + extras + '})';
}

function groundedOffset(row, x, z, targetRootY) {
  const p = row.cframe.position;
  return [x - p[0], targetRootY - (p[1] + row.size[1] / 2 + 2), z - p[2]];
}

/**
 * Bind scheduled lessons to the pinned source's four physical classroom doors.
 * Room letters are routing labels because the source has no room-number signs.
 * The final scheduled subject reuses Room A; it does not invent another room.
 */
export function deriveLegacySchoolBindings(geometry) {
  if (!Array.isArray(geometry)) throw new Error('legacy geometry rows are required');

  const doorRows = geometry.filter((row) => {
    const path = Array.isArray(row?.path) ? row.path : [];
    return path.includes('Workspace') && path.includes('Model')
      && path.includes('SchoolDoorClassroom')
      && String(row?.originalName ?? '') === 'Door'
      && typeof row?.generatedName === 'string'
      && finiteVector(row?.cframe?.position) && finiteVector(row?.size);
  });

  const uniqueDoors = new Map();
  for (const row of doorRows) {
    if (!uniqueDoors.has(row.generatedName)) uniqueDoors.set(row.generatedName, row);
  }
  const doors = [...uniqueDoors.values()].sort((a, b) =>
    a.cframe.position[0] - b.cframe.position[0]
    || a.cframe.position[2] - b.cframe.position[2]
    || a.generatedName.localeCompare(b.generatedName));

  if (doors.length < 4) {
    throw new Error('verified legacy classroom doors missing: expected at least 4, found ' + doors.length);
  }

  const centroid = [0, 1, 2].map((axis) =>
    doors.reduce((sum, row) => sum + row.cframe.position[axis], 0) / doors.length);
  const maximumSeparation = doors.reduce((maximum, row) =>
    Math.max(maximum, ...doors.map((other) => horizontalDistance(row.cframe.position, other.cframe.position))), 0);
  if (maximumSeparation > 300) {
    throw new Error('legacy classroom-door cluster is incoherent: ' + maximumSeparation.toFixed(2) + ' studs');
  }

  const floors = geometry.filter((row) => row.path?.includes('SchoolMat')
    && finiteVector(row?.cframe?.position) && finiteVector(row?.size));
  if (floors.length === 0) throw new Error('school floor reference geometry missing');
  const floorTop = Math.max(...floors.map((row) => row.cframe.position[1] + row.size[1] / 2));
  const targetRootY = floorTop + 3;

  const selected = doors.map((row, index) => {
    const p = row.cframe.position;
    const dx = centroid[0] - p[0];
    const dz = centroid[2] - p[2];
    const length = Math.hypot(dx, dz) || 1;
    const room = String.fromCharCode(65 + index);
    return {
      generatedName: row.generatedName,
      sourcePath: row.path.join('/'),
      sourceName: row.originalName,
      position: p,
      worldOffset: [dx / length * 2, targetRootY - (p[1] + row.size[1] / 2 + 2), dz / length * 2],
      physicalRoomId: 'legacy-classroom-' + room.toLowerCase(),
      physicalClassroomVerified: true,
      label: 'Classroom ' + room,
      room,
    };
  });

  const classes = Object.fromEntries(CLASS_ASSIGNMENTS.map(([classId, label], index) => {
    const room = selected[index % selected.length];
    return [classId, {...room, label, room: room.room}];
  }));

  const food = geometry.filter((row) => row.path?.includes('SchoolFakeFood')
    && finiteVector(row?.cframe?.position) && finiteVector(row?.size));
  if (food.length === 0) throw new Error('pinned school food-area source geometry missing');
  const foodCenter = [0, 1, 2].map((axis) =>
    food.reduce((sum, row) => sum + row.cframe.position[axis], 0) / food.length);
  const foodSource = food.slice().sort((a, b) =>
    horizontalDistance(a.cframe.position, foodCenter) - horizontalDistance(b.cframe.position, foodCenter)
    || a.generatedName.localeCompare(b.generatedName))[0];
  const cafeteria = {
    generatedName: foodSource.generatedName,
    sourcePath: foodSource.path.join('/'),
    sourceName: foodSource.originalName,
    position: foodCenter,
    worldOffset: groundedOffset(foodSource, foodCenter[0], foodCenter[2], targetRootY),
    physicalRoomId: 'legacy-school-lunch-area',
    physicalClassroomVerified: false,
    label: 'School Lunch Area',
  };

  return {
    schoolBuildingId: 'legacy-brookhaven-school',
    selectionBasis: 'pinned-legacy-school-classroom-doors-and-food-v1',
    candidateDoorCount: doors.length,
    maximumSeparation,
    centroid,
    entrance: {...selected[0], label: 'School Arrival • Room ' + selected[0].room},
    cafeteria,
    library: {...selected[0], label: 'Make-Up Classroom • Room ' + selected[0].room},
    classes,
  };
}

export function renderLegacySchoolBindingsLuau(bindings) {
  const classRows = CLASS_ASSIGNMENTS.map(([classId]) => {
    const binding = bindings.classes[classId];
    return '\t\t[' + luaString(classId) + '] = '
      + bindingLiteral(binding, ', Room = ' + luaString(binding.room)) + ',';
  });
  return [
    '--!strict',
    '',
    '-- Generated from pinned-source classroom-door and school food-area geometry.',
    '-- Room letters are generated routing labels; the source does not provide room-number signage.',
    'local LegacySchoolWorldBindings = table.freeze({',
    '\tSchemaVersion = 1,',
    '\tRevision = "legacy-real-school-bindings-v2",',
    '\tWorldRootName = "BrookhavenWorldRuntime",',
    '\tImmutableWitnessName = "BrookhavenWorldBaseline",',
    '\tRuntimeProjectionRequired = true,',
    '\tRuntimeAnchorFolderName = "StarBloxSchoolAnchors",',
    '\tBaselineMutationAllowed = false,',
    '\tAllowFallbackSource = false,',
    '\tFallbackCampusEnabled = false,',
    '\tRequireVerifiedPhysicalClassrooms = true,',
    '\tSchoolBuildingId = ' + luaString(bindings.schoolBuildingId) + ',',
    '\tSelectionBasis = ' + luaString(bindings.selectionBasis) + ',',
    '\tEntrance = ' + bindingLiteral(bindings.entrance) + ',',
    '\tCafeteria = ' + bindingLiteral(bindings.cafeteria) + ',',
    '\tLibrary = ' + bindingLiteral(bindings.library) + ',',
    '\tClasses = table.freeze({',
    ...classRows,
    '\t}),',
    '})',
    '',
    'return LegacySchoolWorldBindings',
    '',
  ].join('\n');
}
