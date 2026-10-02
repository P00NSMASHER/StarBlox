import assert from "node:assert/strict";
import fs from "node:fs";

const modulePath = new URL("../pipsquest/src/shared/CampusDestinationAdapter.luau", import.meta.url);
const specPath = new URL("../pipsquest/tests/CampusDestinationAdapter.spec.luau", import.meta.url);
const source = fs.readFileSync(modulePath, "utf8");
const spec = fs.readFileSync(specPath, "utf8");

const requiredProductionContracts = [
  "--!strict",
  "function CampusDestinationAdapter.fromSchoolBindings",
  "fallback school source must be disabled",
  "fallback campus must be disabled",
  "must be physically verified",
  "study room must not reuse the school entrance anchor",
  "study room must not reuse the cafeteria anchor",
  "class must not reuse the school entrance anchor:",
  "class must not reuse the cafeteria anchor:",
  "table.sort(classIds)",
  "table.sort(nodeIds)",
  "return table.freeze(CampusDestinationAdapter)",
];

for (const marker of requiredProductionContracts) {
  assert.ok(source.includes(marker), `production contract missing: ${marker}`);
}

for (const forbidden of [
  "Workspace",
  "CollectionService",
  "TeleportService",
  "RemoteEvent",
  "RemoteFunction",
  "DataStoreService",
  "MarketplaceService",
]) {
  assert.equal(source.includes(forbidden), false, `destination adapter must not own ${forbidden}`);
}

const requiredBehaviorCases = [
  "adapts verified school bindings into stable route nodes",
  "deduplicates scheduled classes that share a verified physical anchor",
  "allows the study destination to share a verified classroom anchor",
  "sorts route nodes deterministically regardless of class table order",
  "fails closed for unverified or fallback-enabled world bindings",
  "rejects unsafe anchor collisions for entrance and cafeteria",
];

for (const title of requiredBehaviorCases) {
  assert.ok(spec.includes(title), `behavior spec missing: ${title}`);
}

function encodeSegment(value) {
  return `${value.length}:${value}`;
}

function destinationId(buildingId, sourcePartName) {
  return `campus-anchor|${encodeSegment(buildingId)}|${encodeSegment(sourcePartName)}`;
}

function verifyBinding(binding, label) {
  assert.equal(typeof binding, "object", `${label} binding is required`);
  assert.ok(binding.SourcePartName.trim().length > 0);
  assert.ok(binding.Label.trim().length > 0);
  assert.ok(binding.PhysicalRoomId.trim().length > 0);
  assert.equal(binding.PhysicalClassroomVerified, true);
}

function adapt(bindings) {
  assert.ok(bindings.SchoolBuildingId.trim().length > 0);
  assert.notEqual(bindings.AllowFallbackSource, true);
  assert.notEqual(bindings.FallbackCampusEnabled, true);
  if (bindings.RequireVerifiedPhysicalClassrooms != null) {
    assert.equal(bindings.RequireVerifiedPhysicalClassrooms, true);
  }

  verifyBinding(bindings.Entrance, "entrance");
  verifyBinding(bindings.Cafeteria, "cafeteria");
  verifyBinding(bindings.Library, "study room");

  const buildingId = bindings.SchoolBuildingId;
  const entranceId = destinationId(buildingId, bindings.Entrance.SourcePartName);
  const cafeteriaId = destinationId(buildingId, bindings.Cafeteria.SourcePartName);
  const studyId = destinationId(buildingId, bindings.Library.SourcePartName);
  assert.notEqual(entranceId, cafeteriaId);
  assert.notEqual(studyId, entranceId);
  assert.notEqual(studyId, cafeteriaId);

  const nodeSet = new Set([entranceId, cafeteriaId, studyId]);
  const sourcePartByDestinationId = {
    [entranceId]: bindings.Entrance.SourcePartName,
    [cafeteriaId]: bindings.Cafeteria.SourcePartName,
    [studyId]: bindings.Library.SourcePartName,
  };
  const classDestinationIds = {};
  const physicalRoomByClassId = {};
  const classIds = Object.keys(bindings.Classes).sort();
  assert.ok(classIds.length > 0);

  for (const classId of classIds) {
    const binding = bindings.Classes[classId];
    verifyBinding(binding, `class ${classId}`);
    const id = destinationId(buildingId, binding.SourcePartName);
    assert.notEqual(id, entranceId);
    assert.notEqual(id, cafeteriaId);
    nodeSet.add(id);
    sourcePartByDestinationId[id] = binding.SourcePartName;
    classDestinationIds[classId] = id;
    physicalRoomByClassId[classId] = binding.PhysicalRoomId;
  }

  return {
    nodes: [...nodeSet].sort().map((id) => ({id})),
    entranceDestinationId: entranceId,
    cafeteriaDestinationId: cafeteriaId,
    studyDestinationId: studyId,
    classDestinationIds,
    sourcePartByDestinationId,
    physicalRoomByClassId,
  };
}

const fixture = () => ({
  SchoolBuildingId: "legacy-brookhaven-school-complex",
  AllowFallbackSource: false,
  FallbackCampusEnabled: false,
  RequireVerifiedPhysicalClassrooms: true,
  Entrance: {SourcePartName: "LBH_08511", Label: "School Entrance", PhysicalRoomId: "legacy-school-entrance", PhysicalClassroomVerified: true},
  Cafeteria: {SourcePartName: "LBH_11807", Label: "Cafeteria", PhysicalRoomId: "legacy-school-cafeteria", PhysicalClassroomVerified: true},
  Library: {SourcePartName: "LBH_14137", Label: "Study Room / Make-Up", PhysicalRoomId: "legacy-school-study-room", PhysicalClassroomVerified: true},
  Classes: {
    "word-skills": {SourcePartName: "LBH_14137", Label: "Word Skills", PhysicalRoomId: "legacy-classroom-03", PhysicalClassroomVerified: true},
    reading: {SourcePartName: "LBH_11970", Label: "Reading", PhysicalRoomId: "legacy-classroom-01", PhysicalClassroomVerified: true},
    "teacher-choice": {SourcePartName: "LBH_11970", Label: "Teacher's Choice", PhysicalRoomId: "legacy-classroom-01", PhysicalClassroomVerified: true},
    "star-lab": {SourcePartName: "LBH_12380", Label: "STAR Lab", PhysicalRoomId: "legacy-classroom-02", PhysicalClassroomVerified: true},
    math: {SourcePartName: "LBH_12380", Label: "Math", PhysicalRoomId: "legacy-classroom-02", PhysicalClassroomVerified: true},
  },
});

const catalog = adapt(fixture());
assert.equal(catalog.nodes.length, 5);
assert.equal(catalog.classDestinationIds.reading, catalog.classDestinationIds["teacher-choice"]);
assert.equal(catalog.classDestinationIds.math, catalog.classDestinationIds["star-lab"]);
assert.equal(catalog.studyDestinationId, catalog.classDestinationIds["word-skills"]);
assert.equal(catalog.sourcePartByDestinationId[catalog.entranceDestinationId], "LBH_08511");
assert.equal(catalog.physicalRoomByClassId.math, "legacy-classroom-02");

const unverified = fixture();
unverified.Classes.math.PhysicalClassroomVerified = false;
assert.throws(() => adapt(unverified));
const fallback = fixture();
fallback.FallbackCampusEnabled = true;
assert.throws(() => adapt(fallback));
const studyEntranceCollision = fixture();
studyEntranceCollision.Library.SourcePartName = studyEntranceCollision.Entrance.SourcePartName;
assert.throws(() => adapt(studyEntranceCollision));
const studyCafeteriaCollision = fixture();
studyCafeteriaCollision.Library.SourcePartName = studyCafeteriaCollision.Cafeteria.SourcePartName;
assert.throws(() => adapt(studyCafeteriaCollision));
const collision = fixture();
collision.Classes.reading.SourcePartName = collision.Entrance.SourcePartName;
assert.throws(() => adapt(collision));

console.log("CAMPUS_DESTINATION_ADAPTER_VERIFY_OK contracts=12 behaviorCases=6 modelChecks=11 nodes=5");
