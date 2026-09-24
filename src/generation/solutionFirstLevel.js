import { stableHash } from '../domainSchemas';
import { Mulberry32 } from '../sim/deterministicCore';

export const QUEST_LEVEL_SCHEMA_VERSION = 1;
export const QUEST_LEVEL_GENERATOR_VERSION = 'solution-first-v1';

const DEFAULT_ROWS = 4;
const DEFAULT_COLUMNS = 4;
const DEFAULT_STAGE_COUNT = 5;
const DEFAULT_OPTIONAL_COUNT = 3;
const MAX_CELLS = 100;
const ROLE_HINTS = ['practice','review','transfer','practice','transfer'];

function requirePositiveInteger(value,label){
  if(!Number.isInteger(value) || value < 1) throw new TypeError(label + ' must be a positive integer.');
  return value;
}

function requireNonNegativeInteger(value,label){
  if(!Number.isInteger(value) || value < 0) throw new TypeError(label + ' must be a non-negative integer.');
  return value;
}

function cloneJson(value){
  return JSON.parse(JSON.stringify(value));
}

function cellId(row,column,columns){
  return row * columns + column;
}

function cellCoordinate(id,columns){
  return {
    row:Math.floor(id / columns),
    column:id % columns
  };
}

function neighborCellIds(id,rows,columns){
  const {row,column}=cellCoordinate(id,columns);
  const neighbors=[];
  if(row > 0) neighbors.push(cellId(row - 1,column,columns));
  if(column + 1 < columns) neighbors.push(cellId(row,column + 1,columns));
  if(row + 1 < rows) neighbors.push(cellId(row + 1,column,columns));
  if(column > 0) neighbors.push(cellId(row,column - 1,columns));
  return neighbors;
}

function shuffle(items,rng){
  const out=[...items];
  for(let i=out.length - 1;i>0;i--){
    const j=rng.nextInt(0,i);
    [out[i],out[j]]=[out[j],out[i]];
  }
  return out;
}

function undirectedEdgeKey(a,b){
  return a < b ? a + '::' + b : b + '::' + a;
}

function buildSolutionPlan(stageCount){
  const steps=[{
    nodeId:'start',
    type:'start',
    required:true,
    requires:[],
    sparkMin:0,
    sparkReward:0,
    questionSlot:null
  }];

  for(let index=1;index<=stageCount;index++){
    steps.push({
      nodeId:'challenge-' + index,
      type:'challenge',
      required:true,
      requires:[index === 1 ? 'start' : 'challenge-' + (index - 1)],
      sparkMin:index - 1,
      sparkReward:1,
      questionSlot:{
        ordinal:index,
        roleHint:ROLE_HINTS[(index - 1) % ROLE_HINTS.length]
      }
    });
  }

  steps.push({
    nodeId:'boss',
    type:'boss',
    required:true,
    requires:['challenge-' + stageCount],
    sparkMin:stageCount,
    sparkReward:0,
    questionSlot:{
      ordinal:stageCount + 1,
      roleHint:'challenge'
    }
  });

  return steps;
}

function pathSearch(rows,columns,pathLength,rng){
  const allCells=Array.from({length:rows * columns},(_,id) => id);
  const starts=shuffle(allCells,rng);

  const dfs=(path,visited) => {
    if(path.length === pathLength) return true;
    const current=path[path.length - 1];
    const candidates=shuffle(
      neighborCellIds(current,rows,columns).filter(id => !visited.has(id)),
      rng
    ).sort((a,b) => {
      const aOpen=neighborCellIds(a,rows,columns).filter(id => !visited.has(id)).length;
      const bOpen=neighborCellIds(b,rows,columns).filter(id => !visited.has(id)).length;
      return bOpen - aOpen;
    });

    for(const next of candidates){
      visited.add(next);
      path.push(next);
      if(dfs(path,visited)) return true;
      path.pop();
      visited.delete(next);
    }
    return false;
  };

  for(const start of starts){
    const path=[start];
    const visited=new Set([start]);
    if(dfs(path,visited)) return path;
  }
  return null;
}

function placeOptionalNodes({
  rows,
  columns,
  pathCells,
  optionalCount,
  rng
}){
  if(optionalCount === 0) return [];

  const occupied=new Set(pathCells);
  const placed=[...pathCells];
  const optional=[];

  for(let index=0;index<optionalCount;index++){
    const frontier=[];
    for(let id=0;id<rows * columns;id++){
      if(occupied.has(id)) continue;
      const anchors=neighborCellIds(id,rows,columns).filter(candidate => occupied.has(candidate));
      if(anchors.length){
        frontier.push({
          id,
          anchors:shuffle(anchors,rng)
        });
      }
    }

    if(frontier.length === 0) return null;
    const selected=shuffle(frontier,rng)[0];
    const anchorCell=selected.anchors[0];
    occupied.add(selected.id);
    placed.push(selected.id);
    optional.push({
      cell:selected.id,
      anchorCell
    });
  }

  return optional;
}

function buildPlacedLevel({
  seed,
  rows,
  columns,
  stageCount,
  optionalCount
}){
  const rng=new Mulberry32(seed);
  const solutionPlan=buildSolutionPlan(stageCount);
  const pathCells=pathSearch(rows,columns,solutionPlan.length,rng);
  if(!pathCells) return null;

  const optionalPlacements=placeOptionalNodes({
    rows,
    columns,
    pathCells,
    optionalCount,
    rng
  });
  if(!optionalPlacements) return null;

  const nodeByCell=new Map();
  const nodes=solutionPlan.map((step,index) => {
    const coordinate=cellCoordinate(pathCells[index],columns);
    const node={
      ...cloneJson(step),
      row:coordinate.row,
      column:coordinate.column
    };
    nodeByCell.set(pathCells[index],node.nodeId);
    return node;
  });

  const edges=[];
  const edgeKeys=new Set();
  const addEdge=(a,b,kind) => {
    const key=undirectedEdgeKey(a,b);
    if(edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({a,b,kind});
  };

  for(let index=1;index<solutionPlan.length;index++){
    addEdge(solutionPlan[index - 1].nodeId,solutionPlan[index].nodeId,'solution');
  }

  optionalPlacements.forEach((placement,index) => {
    const coordinate=cellCoordinate(placement.cell,columns);
    const anchorNodeId=nodeByCell.get(placement.anchorCell);
    const nodeId='optional-' + (index + 1);
    const type=index % 2 === 0 ? 'recovery' : 'bonus';
    const node={
      nodeId,
      type,
      required:false,
      requires:[anchorNodeId],
      sparkMin:0,
      sparkReward:0,
      questionSlot:type === 'recovery'
        ? {ordinal:null,roleHint:'practice'}
        : null,
      row:coordinate.row,
      column:coordinate.column
    };
    nodes.push(node);
    nodeByCell.set(placement.cell,nodeId);
    addEdge(anchorNodeId,nodeId,'optional');
  });

  const certificatePath=solutionPlan.map(step => step.nodeId);
  const certificatePayload={
    path:certificatePath,
    expectedFinal:{
      sparks:stageCount,
      completed:true,
      bossNodeId:'boss'
    }
  };

  return {
    schemaVersion:QUEST_LEVEL_SCHEMA_VERSION,
    generatorVersion:QUEST_LEVEL_GENERATOR_VERSION,
    seed:seed >>> 0,
    grid:{rows,columns},
    stageCount,
    nodes,
    edges,
    solutionCertificate:{
      ...certificatePayload,
      certificateHash:stableHash(certificatePayload)
    }
  };
}

function edgeExists(edges,a,b){
  const key=undirectedEdgeKey(a,b);
  return edges.some(edge => undirectedEdgeKey(edge.a,edge.b) === key);
}

function adjacent(a,b){
  return Math.abs(a.row - b.row) + Math.abs(a.column - b.column) === 1;
}

export function verifySolutionCertificate(level){
  if(!level || typeof level !== 'object' || Array.isArray(level)){
    return {ok:false,reason:'level must be an object'};
  }
  if(level.schemaVersion !== QUEST_LEVEL_SCHEMA_VERSION){
    return {ok:false,reason:'unsupported level schema'};
  }
  if(level.generatorVersion !== QUEST_LEVEL_GENERATOR_VERSION){
    return {ok:false,reason:'unsupported level generator'};
  }

  const rows=level.grid?.rows;
  const columns=level.grid?.columns;
  if(!Number.isInteger(rows) || rows < 1 || !Number.isInteger(columns) || columns < 1){
    return {ok:false,reason:'invalid grid'};
  }
  if(!Array.isArray(level.nodes) || !Array.isArray(level.edges)){
    return {ok:false,reason:'nodes and edges are required'};
  }

  const byId=new Map();
  const occupied=new Set();
  for(const node of level.nodes){
    if(!node || typeof node.nodeId !== 'string' || !node.nodeId){
      return {ok:false,reason:'invalid node'};
    }
    if(byId.has(node.nodeId)) return {ok:false,reason:'duplicate node id'};
    if(!Number.isInteger(node.row) || node.row < 0 || node.row >= rows ||
       !Number.isInteger(node.column) || node.column < 0 || node.column >= columns){
      return {ok:false,reason:'node outside grid'};
    }
    const coordinateKey=node.row + ':' + node.column;
    if(occupied.has(coordinateKey)) return {ok:false,reason:'duplicate node coordinate'};
    occupied.add(coordinateKey);
    byId.set(node.nodeId,node);
  }

  const certificate=level.solutionCertificate;
  if(!certificate || !Array.isArray(certificate.path) || certificate.path.length < 2){
    return {ok:false,reason:'missing solution path'};
  }

  const certificatePayload={
    path:certificate.path,
    expectedFinal:certificate.expectedFinal
  };
  if(stableHash(certificatePayload) !== certificate.certificateHash){
    return {ok:false,reason:'solution certificate hash mismatch'};
  }

  const requiredIds=level.nodes.filter(node => node.required).map(node => node.nodeId);
  const pathSet=new Set(certificate.path);
  if(requiredIds.some(nodeId => !pathSet.has(nodeId))){
    return {ok:false,reason:'solution path omits required node'};
  }
  if(certificate.path.length !== pathSet.size){
    return {ok:false,reason:'solution path repeats a node'};
  }

  let sparks=0;
  const visited=new Set();

  for(let index=0;index<certificate.path.length;index++){
    const nodeId=certificate.path[index];
    const node=byId.get(nodeId);
    if(!node) return {ok:false,reason:'solution references missing node'};

    if(index === 0 && node.type !== 'start'){
      return {ok:false,reason:'solution must begin at start'};
    }
    if(index === certificate.path.length - 1 && node.type !== 'boss'){
      return {ok:false,reason:'solution must end at boss'};
    }

    if(index > 0){
      const previous=byId.get(certificate.path[index - 1]);
      if(!previous || !adjacent(previous,node)){
        return {ok:false,reason:'solution path contains non-adjacent grid nodes'};
      }
      if(!edgeExists(level.edges,previous.nodeId,node.nodeId)){
        return {ok:false,reason:'solution path edge is missing'};
      }
    }

    const requirements=Array.isArray(node.requires) ? node.requires : [];
    if(requirements.some(requirement => !visited.has(requirement))){
      return {ok:false,reason:'node prerequisites are not satisfied'};
    }

    const sparkMin=Number.isInteger(node.sparkMin) ? node.sparkMin : 0;
    const sparkReward=Number.isInteger(node.sparkReward) ? node.sparkReward : 0;
    if(sparks < sparkMin){
      return {ok:false,reason:'solution lacks required sparks'};
    }
    if(sparkReward < 0){
      return {ok:false,reason:'negative spark reward'};
    }

    sparks += sparkReward;
    visited.add(node.nodeId);
  }

  const expected=certificate.expectedFinal;
  if(!expected || expected.completed !== true || expected.bossNodeId !== 'boss'){
    return {ok:false,reason:'invalid certificate final state'};
  }
  if(sparks !== expected.sparks){
    return {ok:false,reason:'certificate final spark total mismatch'};
  }
  if(!visited.has('boss')){
    return {ok:false,reason:'boss was not completed'};
  }

  return {
    ok:true,
    finalState:{
      sparks,
      completed:true,
      visited:[...visited]
    }
  };
}

export function generateCertifiedQuestLevel({
  seed,
  rows=DEFAULT_ROWS,
  columns=DEFAULT_COLUMNS,
  stageCount=DEFAULT_STAGE_COUNT,
  optionalCount=DEFAULT_OPTIONAL_COUNT
}={}){
  const cleanSeed=requireNonNegativeInteger(seed,'seed') >>> 0;
  const cleanRows=requirePositiveInteger(rows,'rows');
  const cleanColumns=requirePositiveInteger(columns,'columns');
  const cleanStageCount=requirePositiveInteger(stageCount,'stageCount');
  const cleanOptionalCount=requireNonNegativeInteger(optionalCount,'optionalCount');

  const cells=cleanRows * cleanColumns;
  if(cells > MAX_CELLS) throw new RangeError('level grid is too large.');
  const requiredNodeCount=cleanStageCount + 2;
  const totalNodeCount=requiredNodeCount + cleanOptionalCount;
  if(totalNodeCount > cells){
    throw new RangeError('grid does not have enough cells for the requested level.');
  }

  const level=buildPlacedLevel({
    seed:cleanSeed,
    rows:cleanRows,
    columns:cleanColumns,
    stageCount:cleanStageCount,
    optionalCount:cleanOptionalCount
  });
  if(!level) throw new Error('unable to place a certified solution on this grid.');

  const verification=verifySolutionCertificate(level);
  if(!verification.ok){
    throw new Error('generated level failed certificate verification: ' + verification.reason);
  }

  const payload={
    ...level,
    certificateVerified:true
  };

  return Object.freeze({
    ...payload,
    levelHash:stableHash(payload)
  });
}

export function certifiedNextNode(level,visitedNodeIds=[]){
  const verification=verifySolutionCertificate(level);
  if(!verification.ok) return null;

  const visited=new Set(visitedNodeIds);
  return level.solutionCertificate.path.find(nodeId => !visited.has(nodeId)) ?? null;
}
