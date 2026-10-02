import assert from "node:assert/strict";
import fs from "node:fs";

const modulePath = new URL("../pipsquest/src/shared/CampusRoutePlanner.luau", import.meta.url);
const specPath = new URL("../pipsquest/tests/CampusRoutePlanner.spec.luau", import.meta.url);
const source = fs.readFileSync(modulePath, "utf8");
const spec = fs.readFileSync(specPath, "utf8");

const requiredProductionContracts = [
  "--!strict",
  "function CampusRoutePlanner.new",
  "function Planner.plan",
  "duplicate node id:",
  "duplicate edge id:",
  "edge endpoint missing:",
  "unknown blocked edge id:",
  "candidateDistance < existingDistance",
  "return makeRoute(false",
  "return table.freeze(CampusRoutePlanner)",
];

for (const marker of requiredProductionContracts) {
  assert.ok(source.includes(marker), `production contract missing: ${marker}`);
}

for (const forbidden of ["DataStoreService", "RemoteEvent", "RemoteFunction", "TeleportService", "MarketplaceService"]) {
  assert.equal(source.includes(forbidden), false, `pure route planner must not own ${forbidden}`);
}

const requiredBehaviorCases = [
  "chooses the lowest-cost campus route",
  "breaks equal-cost route ties deterministically",
  "reroutes around temporarily blocked doors or corridors",
  "reports unreachable destinations without inventing a fallback",
  "respects explicitly one-way world links",
  "rejects malformed campus graphs and unknown blocked edges",
];

for (const title of requiredBehaviorCases) {
  assert.ok(spec.includes(title), `behavior spec missing: ${title}`);
}

function encodeId(value) {
  return `${value.length}:${value}`;
}

function buildPlanner(nodes, edges) {
  assert.ok(nodes.length > 0);
  const nodeIds = [];
  const nodeSet = new Set();
  const adjacency = new Map();

  for (const node of nodes) {
    assert.equal(typeof node.id, "string");
    assert.ok(node.id.trim().length > 0);
    assert.equal(nodeSet.has(node.id), false);
    nodeSet.add(node.id);
    nodeIds.push(node.id);
    adjacency.set(node.id, []);
  }
  nodeIds.sort();

  const edgeIds = new Set();
  for (const edge of edges) {
    assert.equal(typeof edge.id, "string");
    assert.ok(edge.id.trim().length > 0);
    assert.equal(edgeIds.has(edge.id), false);
    assert.ok(nodeSet.has(edge.from));
    assert.ok(nodeSet.has(edge.to));
    assert.notEqual(edge.from, edge.to);
    assert.ok(Number.isFinite(edge.cost) && edge.cost > 0);
    edgeIds.add(edge.id);

    adjacency.get(edge.from).push({to: edge.to, edgeId: edge.id, cost: edge.cost});
    if (edge.bidirectional !== false) {
      adjacency.get(edge.to).push({to: edge.from, edgeId: edge.id, cost: edge.cost});
    }
  }

  for (const hops of adjacency.values()) {
    hops.sort((left, right) => left.to.localeCompare(right.to) || left.edgeId.localeCompare(right.edgeId));
  }

  return {
    plan(originId, destinationId, blockedEdgeIds = {}) {
      assert.ok(nodeSet.has(originId));
      assert.ok(nodeSet.has(destinationId));
      for (const [edgeId, isBlocked] of Object.entries(blockedEdgeIds)) {
        if (isBlocked) assert.ok(edgeIds.has(edgeId));
      }

      if (originId === destinationId) {
        return {reachable: true, nodeIds: [originId], edgeIds: [], totalCost: 0};
      }

      const distances = Object.fromEntries(nodeIds.map((id) => [id, Number.POSITIVE_INFINITY]));
      const routeKeys = {};
      const previousNode = {};
      const previousEdge = {};
      const unvisited = new Set(nodeIds);
      distances[originId] = 0;
      routeKeys[originId] = encodeId(originId);

      while (true) {
        let current = null;
        let bestDistance = Number.POSITIVE_INFINITY;
        let bestKey = null;

        for (const nodeId of nodeIds) {
          if (!unvisited.has(nodeId)) continue;
          const distance = distances[nodeId];
          const routeKey = routeKeys[nodeId];
          if (distance < bestDistance ||
            (distance === bestDistance && routeKey != null && (bestKey == null || routeKey < bestKey))) {
            current = nodeId;
            bestDistance = distance;
            bestKey = routeKey;
          }
        }

        if (current == null || bestDistance === Number.POSITIVE_INFINITY) break;
        if (current === destinationId) break;
        unvisited.delete(current);

        for (const hop of adjacency.get(current)) {
          if (!unvisited.has(hop.to) || blockedEdgeIds[hop.edgeId] === true) continue;
          const candidateDistance = bestDistance + hop.cost;
          const candidateKey = `${routeKeys[current]}|${encodeId(hop.to)}|${encodeId(hop.edgeId)}`;
          const existingDistance = distances[hop.to];
          const existingKey = routeKeys[hop.to];
          if (candidateDistance < existingDistance ||
            (candidateDistance === existingDistance && (existingKey == null || candidateKey < existingKey))) {
            distances[hop.to] = candidateDistance;
            routeKeys[hop.to] = candidateKey;
            previousNode[hop.to] = current;
            previousEdge[hop.to] = hop.edgeId;
          }
        }
      }

      if (distances[destinationId] === Number.POSITIVE_INFINITY) {
        return {reachable: false, nodeIds: [], edgeIds: [], totalCost: null};
      }

      const nodeIdsReversed = [destinationId];
      const edgeIdsReversed = [];
      let cursor = destinationId;
      while (cursor !== originId) {
        edgeIdsReversed.push(previousEdge[cursor]);
        cursor = previousNode[cursor];
        nodeIdsReversed.push(cursor);
      }

      return {
        reachable: true,
        nodeIds: nodeIdsReversed.reverse(),
        edgeIds: edgeIdsReversed.reverse(),
        totalCost: distances[destinationId],
      };
    },
  };
}

const nodes = [
  {id: "ENTRANCE"},
  {id: "HALL_A"},
  {id: "HALL_B"},
  {id: "CLASSROOM_101"},
  {id: "CAFETERIA"},
];
const edges = [
  {id: "ENTRANCE_A", from: "ENTRANCE", to: "HALL_A", cost: 1},
  {id: "A_CLASS", from: "HALL_A", to: "CLASSROOM_101", cost: 2},
  {id: "ENTRANCE_B", from: "ENTRANCE", to: "HALL_B", cost: 1},
  {id: "B_CLASS", from: "HALL_B", to: "CLASSROOM_101", cost: 2},
  {id: "A_CAFE", from: "HALL_A", to: "CAFETERIA", cost: 1},
  {id: "B_CAFE", from: "HALL_B", to: "CAFETERIA", cost: 2},
];

const planner = buildPlanner(nodes, edges);
assert.deepEqual(planner.plan("ENTRANCE", "CAFETERIA").nodeIds, ["ENTRANCE", "HALL_A", "CAFETERIA"]);
assert.deepEqual(planner.plan("ENTRANCE", "CLASSROOM_101").nodeIds, ["ENTRANCE", "HALL_A", "CLASSROOM_101"]);
assert.deepEqual(planner.plan("ENTRANCE", "CLASSROOM_101", {A_CLASS: true}).nodeIds, ["ENTRANCE", "HALL_B", "CLASSROOM_101"]);
assert.equal(planner.plan("ENTRANCE", "CLASSROOM_101", {A_CLASS: true, B_CLASS: true}).reachable, false);

const oneWay = buildPlanner(
  [{id: "GYM"}, {id: "COURTYARD"}],
  [{id: "EXIT_GATE", from: "GYM", to: "COURTYARD", cost: 1, bidirectional: false}],
);
assert.equal(oneWay.plan("GYM", "COURTYARD").reachable, true);
assert.equal(oneWay.plan("COURTYARD", "GYM").reachable, false);
assert.equal(planner.plan("ENTRANCE", "ENTRANCE").totalCost, 0);
assert.throws(() => planner.plan("ENTRANCE", "CAFETERIA", {MISSING: true}));

console.log("CAMPUS_ROUTE_PLANNER_VERIFY_OK contracts=10 behaviorCases=6 modelChecks=8");
