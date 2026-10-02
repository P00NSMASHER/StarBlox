import assert from "node:assert/strict";
import fs from "node:fs";

const modulePath = new URL("../pipsquest/src/shared/CampusTopologyAdapter.luau", import.meta.url);
const specPath = new URL("../pipsquest/tests/CampusTopologyAdapter.spec.luau", import.meta.url);
const source = fs.readFileSync(modulePath, "utf8");
const spec = fs.readFileSync(specPath, "utf8");

const requiredProductionContracts = [
  "--!strict",
  "function CampusTopologyAdapter.fromVerifiedTopology",
  "function CampusTopologyAdapter.blockedEdgeIdsForInteractions",
  "campus topology must be explicitly verified",
  "corridor node collides with existing node:",
  "topology link endpoint missing:",
  "topology door part is not a reviewed interaction:",
  "duplicate reviewed door part:",
  "unknown blocked campus interaction id:",
  "table.sort(edges",
  "table.sort(entries)",
  "return table.freeze(CampusTopologyAdapter)",
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
  assert.equal(source.includes(forbidden), false, `topology adapter must not own ${forbidden}`);
}

const requiredBehaviorCases = [
  "normalizes verified campus topology into route-planner inputs",
  "maps reviewed door interactions to blockable route edges",
  "sorts nodes, edges, and shared-door edge mappings deterministically",
  "fails closed for unverified topology and unknown door parts",
  "rejects endpoint drift and corridor collisions",
  "rejects duplicate interaction identities and unknown blocked interactions",
];

for (const title of requiredBehaviorCases) {
  assert.ok(spec.includes(title), `behavior spec missing: ${title}`);
}

function encodeSegment(value) {
  return `${value.length}:${value}`;
}

function routeEdgeId(revision, linkId) {
  return `campus-link|${encodeSegment(revision)}|${encodeSegment(linkId)}`;
}

function adapt(destinations, interactions, definition) {
  assert.equal(definition.verified, true);
  assert.ok(definition.revision.trim().length > 0);
  assert.ok(Array.isArray(definition.corridorNodeIds));
  assert.ok(Array.isArray(definition.links));

  const nodeSet = new Set();
  const nodeIds = [];
  for (const node of destinations.nodes) {
    assert.ok(node.id.trim().length > 0);
    assert.equal(nodeSet.has(node.id), false);
    nodeSet.add(node.id);
    nodeIds.push(node.id);
  }
  assert.ok(nodeIds.length > 0);

  for (const corridorNodeId of definition.corridorNodeIds) {
    assert.ok(corridorNodeId.trim().length > 0);
    assert.equal(nodeSet.has(corridorNodeId), false);
    nodeSet.add(corridorNodeId);
    nodeIds.push(corridorNodeId);
  }
  nodeIds.sort();

  const interactionIdByPartName = new Map();
  const interactionIds = new Set();
  for (const binding of interactions.Doors) {
    assert.ok(binding.Id.trim().length > 0);
    assert.ok(binding.PartName.trim().length > 0);
    assert.equal(interactionIds.has(binding.Id), false);
    assert.equal(interactionIdByPartName.has(binding.PartName), false);
    interactionIds.add(binding.Id);
    interactionIdByPartName.set(binding.PartName, binding.Id);
  }

  const seenLinkIds = new Set();
  const edges = [];
  const interactionIdByEdgeId = {};
  const edgeIdsByInteractionId = {};

  for (const link of definition.links) {
    assert.ok(link.id.trim().length > 0);
    assert.equal(seenLinkIds.has(link.id), false);
    seenLinkIds.add(link.id);
    assert.ok(nodeSet.has(link.from));
    assert.ok(nodeSet.has(link.to));
    assert.notEqual(link.from, link.to);
    assert.ok(Number.isFinite(link.cost) && link.cost > 0);

    const edgeId = routeEdgeId(definition.revision, link.id);
    edges.push({
      id: edgeId,
      from: link.from,
      to: link.to,
      cost: link.cost,
      bidirectional: link.bidirectional,
    });

    if (link.doorPartName != null) {
      assert.ok(link.doorPartName.trim().length > 0);
      const interactionId = interactionIdByPartName.get(link.doorPartName);
      assert.notEqual(interactionId, undefined);
      interactionIdByEdgeId[edgeId] = interactionId;
      edgeIdsByInteractionId[interactionId] ??= [];
      edgeIdsByInteractionId[interactionId].push(edgeId);
    }
  }

  edges.sort((left, right) => left.id.localeCompare(right.id));
  for (const edgeIds of Object.values(edgeIdsByInteractionId)) {
    edgeIds.sort();
  }

  return {revision: definition.revision, nodes: nodeIds.map((id) => ({id})), edges, interactionIdByEdgeId, edgeIdsByInteractionId};
}

function blockedEdgeIdsForInteractions(topology, blockedInteractionIds) {
  const blockedEdges = {};
  for (const [interactionId, isBlocked] of Object.entries(blockedInteractionIds)) {
    if (!isBlocked) continue;
    const edgeIds = topology.edgeIdsByInteractionId[interactionId];
    assert.notEqual(edgeIds, undefined);
    for (const edgeId of edgeIds) blockedEdges[edgeId] = true;
  }
  return blockedEdges;
}

const destinations = {
  nodes: [{id: "ENTRANCE"}, {id: "CLASSROOM"}, {id: "CAFETERIA"}],
};
const interactions = {
  Doors: [
    {Id: "door-class", PartName: "DOOR_CLASS"},
    {Id: "door-cafe", PartName: "DOOR_CAFE"},
  ],
};
const definition = {
  revision: "school-topology-v1",
  verified: true,
  corridorNodeIds: ["HALL_B", "HALL_A"],
  links: [
    {id: "entrance-hall", from: "ENTRANCE", to: "HALL_A", cost: 1},
    {id: "hall-class", from: "HALL_A", to: "CLASSROOM", cost: 2, doorPartName: "DOOR_CLASS"},
    {id: "hall-cafe", from: "HALL_A", to: "CAFETERIA", cost: 3, doorPartName: "DOOR_CAFE"},
  ],
};

const topology = adapt(destinations, interactions, definition);
assert.deepEqual(topology.nodes.map((node) => node.id), ["CAFETERIA", "CLASSROOM", "ENTRANCE", "HALL_A", "HALL_B"]);
assert.equal(topology.edges.length, 3);
assert.ok(topology.edges[0].id < topology.edges[1].id);
const classEdgeIds = topology.edgeIdsByInteractionId["door-class"];
assert.equal(classEdgeIds.length, 1);
assert.equal(topology.interactionIdByEdgeId[classEdgeIds[0]], "door-class");
assert.deepEqual(blockedEdgeIdsForInteractions(topology, {"door-class": true}), {[classEdgeIds[0]]: true});

const sharedDoor = structuredClone(definition);
sharedDoor.links = [
  {id: "z-link", from: "HALL_A", to: "CLASSROOM", cost: 2, doorPartName: "DOOR_CLASS"},
  {id: "a-link", from: "HALL_B", to: "CLASSROOM", cost: 2, doorPartName: "DOOR_CLASS"},
];
const shared = adapt(destinations, interactions, sharedDoor);
assert.ok(shared.edgeIdsByInteractionId["door-class"][0] < shared.edgeIdsByInteractionId["door-class"][1]);

const unverified = structuredClone(definition);
unverified.verified = false;
assert.throws(() => adapt(destinations, interactions, unverified));

const unknownDoor = structuredClone(definition);
unknownDoor.links = [{id: "bad", from: "ENTRANCE", to: "HALL_A", cost: 1, doorPartName: "UNREVIEWED_DOOR"}];
assert.throws(() => adapt(destinations, interactions, unknownDoor));

const missingEndpoint = structuredClone(definition);
missingEndpoint.links = [{id: "bad", from: "ENTRANCE", to: "MISSING", cost: 1}];
assert.throws(() => adapt(destinations, interactions, missingEndpoint));

const collision = structuredClone(definition);
collision.corridorNodeIds = ["ENTRANCE"];
assert.throws(() => adapt(destinations, interactions, collision));

const duplicatePartInteractions = {
  Doors: [
    {Id: "door-one", PartName: "SAME_PART"},
    {Id: "door-two", PartName: "SAME_PART"},
  ],
};
assert.throws(() => adapt(destinations, duplicatePartInteractions, definition));
assert.throws(() => blockedEdgeIdsForInteractions(topology, {missing: true}));

console.log("CAMPUS_TOPOLOGY_ADAPTER_VERIFY_OK contracts=12 isolationChecks=7 behaviorCases=6 modelChecks=12");
