const CLASS_ASSIGNMENTS = Object.freeze([
  ['reading', 'Reading', '101', 0],
  ['math', 'Math', '102', 1],
  ['word-skills', 'Word Skills', '103', 2],
  ['teacher-choice', "Teacher's Choice", '101', 0],
  ['star-lab', 'STAR Lab', '102', 1],
]);

function finiteVector(value, length = 3) {
  return Array.isArray(value)
    && value.length === length
    && value.every((entry) => Number.isFinite(Number(entry)));
}

function position(row) {
  return row?.cframe?.position;
}

function pathText(row) {
  return Array.isArray(row?.path) ? row.path.join('/') : '';
}

function horizontalDistance(a, b) {
  return Math.hypot(a[0] - b[0], a[2] - b[2]);
}

function centroid(rows) {
  return [0, 1, 2].map((axis) => rows.reduce((sum, row) => sum + position(row)[axis], 0) / rows.length);
}

function clusters(rows, maxGap) {
  const remaining = new Set(rows);
  const result = [];
  while (remaining.size) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const cluster = [first];
    for (let index = 0; index < cluster.length; index += 1) {
      const current = cluster[index];
      for (const candidate of [...remaining]) {
        if (horizontalDistance(position(current), position(candidate)) <= maxGap) {
          remaining.delete(candidate);
          cluster.push(candidate);
        }
      }
    }
    result.push(cluster);
  }
  return result;
}

function unitOffset(from, to, studs) {
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  const length = Math.hypot(dx, dz) || 1;
  return [dx / length * studs, 0, dz / length * studs];
}

function luaString(value) {
  return `"${String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n')}"`;
}

function vectorLiteral(vector) {
  return `Vector3.new(${vector.map((value) => Number(value.toFixed(4))).join(', ')})`;
}

function bindingLiteral(binding, extras = '') {
  return `table.freeze({SourcePartName = ${luaString(binding.generatedName)}, AnchorFromSourceCenter = true, HeightOffset = ${binding.heightOffset}, WorldOffset = ${vectorLiteral(binding.worldOffset)}, Label = ${luaString(binding.label)}, PhysicalRoomId = ${luaString(binding.physicalRoomId)}, SourceWorldPath = ${luaString(binding.sourcePath)}, PhysicalClassroomVerified = true${extras}})`;
}

function validGeometry(row) {
  return typeof row?.generatedName === 'string'
    && finiteVector(position(row))
    && finiteVector(row?.size);
}

/**
 * Derive roles from physical evidence instead of source-name ordering:
 * entrance = mat beside the largest school sign; cafeteria = door beside food
 * fixtures; classroom = door leading toward a distinct desk cluster and board.
 */
export function deriveLegacySchoolBindings(geometry) {
  if (!Array.isArray(geometry)) throw new Error('legacy geometry rows are required');

  const valid = geometry.filter(validGeometry);
  const schoolControl = valid.filter((row) => row.path?.some((segment) => segment === '001_School'));
  if (!schoolControl.length) throw new Error('pinned legacy 001_School control geometry is missing');
  const schoolCenter = centroid(schoolControl);
  const inSchoolComplex = (row) => horizontalDistance(position(row), schoolCenter) <= 170
    && position(row)[1] >= -5
    && position(row)[1] <= 40;

  const signs = valid.filter((row) => /\/School sighn$/i.test(pathText(row)) && inSchoolComplex(row));
  const mats = valid.filter((row) => /\/SchoolMat$/i.test(pathText(row)) && inSchoolComplex(row));
  if (!signs.length || !mats.length) throw new Error('verified legacy school entrance evidence is missing');
  const mainSign = signs.slice().sort((a, b) =>
    (b.size[1] * Math.max(b.size[0], b.size[2])) - (a.size[1] * Math.max(a.size[0], a.size[2]))
    || a.generatedName.localeCompare(b.generatedName))[0];
  const entranceMat = mats.slice().sort((a, b) =>
    horizontalDistance(position(a), position(mainSign)) - horizontalDistance(position(b), position(mainSign))
    || a.generatedName.localeCompare(b.generatedName))[0];
  const entranceSignDistance = horizontalDistance(position(entranceMat), position(mainSign));
  if (entranceSignDistance > 18) throw new Error('legacy school entrance mat is not coherent with the main sign');

  const doorRows = valid.filter((row) =>
    /\/SchoolDoorClassroom\/(?:Door|Frame)$/i.test(pathText(row)) && inSchoolComplex(row));
  const doorByPosition = new Map();
  for (const row of doorRows) {
    const key = `${Math.round(position(row)[0] * 2)}:${Math.round(position(row)[2] * 2)}`;
    const previous = doorByPosition.get(key);
    if (!previous || row.originalName === 'Door' || row.generatedName.localeCompare(previous.generatedName) < 0) {
      doorByPosition.set(key, row);
    }
  }
  const doors = [...doorByPosition.values()];

  const food = valid.filter((row) => /\/SchoolFakeFood\//i.test(pathText(row)) && inSchoolComplex(row));
  if (!food.length) throw new Error('verified legacy school cafeteria fixtures are missing');
  const foodCenter = centroid(food);
  const cafeteriaDoor = doors.slice().sort((a, b) =>
    horizontalDistance(position(a), foodCenter) - horizontalDistance(position(b), foodCenter)
    || a.generatedName.localeCompare(b.generatedName))[0];
  const cafeteriaEvidenceDistance = cafeteriaDoor
    ? horizontalDistance(position(cafeteriaDoor), foodCenter)
    : Infinity;
  if (!cafeteriaDoor || cafeteriaEvidenceDistance > 35) {
    throw new Error('verified legacy cafeteria door is missing');
  }

  const deskSeats = valid.filter((row) => /\/SchoolDesks\/DeskMesh\/Seat$/i.test(pathText(row)) && inSchoolComplex(row));
  const deskClusters = clusters(deskSeats, 20).filter((cluster) => cluster.length >= 4);
  const boards = valid.filter((row) => /\/SchoolDryBoard\//i.test(pathText(row)) && inSchoolComplex(row));
  const classroomCandidates = [];
  for (const deskCluster of deskClusters) {
    const deskCenter = centroid(deskCluster);
    const boardDistance = boards.reduce((minimum, row) =>
      Math.min(minimum, horizontalDistance(position(row), deskCenter)), Infinity);
    const availableDoors = doors.filter((row) =>
      row.generatedName !== cafeteriaDoor.generatedName
      && Math.abs(position(row)[1] - deskCenter[1]) <= 8);
    const door = availableDoors.slice().sort((a, b) =>
      horizontalDistance(position(a), deskCenter) - horizontalDistance(position(b), deskCenter)
      || a.generatedName.localeCompare(b.generatedName))[0];
    const doorDistance = door ? horizontalDistance(position(door), deskCenter) : Infinity;
    if (door && doorDistance <= 35 && boardDistance <= 35) {
      classroomCandidates.push({door, deskCenter, deskCount: deskCluster.length, doorDistance, boardDistance});
    }
  }

  const uniqueRooms = new Map();
  for (const room of classroomCandidates) {
    const previous = uniqueRooms.get(room.door.generatedName);
    if (!previous || room.doorDistance < previous.doorDistance) uniqueRooms.set(room.door.generatedName, room);
  }
  const rooms = [...uniqueRooms.values()].sort((a, b) => a.door.generatedName.localeCompare(b.door.generatedName));
  if (rooms.length < 3) {
    throw new Error(`verified legacy classrooms missing: expected 3 fixture-backed rooms, found ${rooms.length}`);
  }

  const roomBindings = rooms.slice(0, 3).map((room, index) => ({
    generatedName: room.door.generatedName,
    sourcePath: pathText(room.door),
    sourceName: room.door.originalName,
    position: position(room.door),
    worldOffset: unitOffset(position(room.door), room.deskCenter, 7),
    heightOffset: -3.5,
    physicalRoomId: `legacy-classroom-${String(index + 1).padStart(2, '0')}`,
    evidence: {
      deskCount: room.deskCount,
      deskCentroid: room.deskCenter,
      doorToDeskDistanceStuds: room.doorDistance,
      nearestBoardDistanceStuds: room.boardDistance,
    },
  }));

  const classes = Object.fromEntries(CLASS_ASSIGNMENTS.map(([classId, label, room, roomIndex]) => [classId, {
    ...roomBindings[roomIndex],
    label,
    room,
  }]));

  return {
    schoolBuildingId: 'legacy-brookhaven-school-complex',
    selectionBasis: 'pinned-legacy-school-fixture-evidence-v2',
    schoolCenter,
    entrance: {
      generatedName: entranceMat.generatedName,
      sourcePath: pathText(entranceMat),
      sourceName: entranceMat.originalName,
      position: position(entranceMat),
      worldOffset: unitOffset(position(entranceMat), schoolCenter, 7),
      heightOffset: 0,
      physicalRoomId: 'legacy-school-entrance',
      label: 'School Entrance',
    },
    cafeteria: {
      generatedName: cafeteriaDoor.generatedName,
      sourcePath: pathText(cafeteriaDoor),
      sourceName: cafeteriaDoor.originalName,
      position: position(cafeteriaDoor),
      worldOffset: unitOffset(position(cafeteriaDoor), foodCenter, 7),
      heightOffset: -3.5,
      physicalRoomId: 'legacy-school-cafeteria',
      label: 'Cafeteria',
    },
    library: {
      ...roomBindings[2],
      label: 'Study Room / Make-Up',
      physicalRoomId: 'legacy-school-study-room',
    },
    classes,
    evidence: {
      mainSign: mainSign.generatedName,
      entranceSignDistanceStuds: entranceSignDistance,
      cafeteriaFoodFixtureCount: food.length,
      cafeteriaEvidenceDistanceStuds: cafeteriaEvidenceDistance,
      classroomRooms: roomBindings.map((room) => ({
        generatedName: room.generatedName,
        sourcePath: room.sourcePath,
        physicalRoomId: room.physicalRoomId,
        ...room.evidence,
      })),
    },
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
    '-- Roles require exact school fixtures; missing or drifted evidence fails generation.',
    'local LegacySchoolWorldBindings = table.freeze({',
    '\tSchemaVersion = 2,',
    '\tRevision = "legacy-real-school-bindings-v2",',
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
