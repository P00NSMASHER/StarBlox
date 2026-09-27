import {describe,expect,it} from 'vitest';
import {inspectLegacySchoolStructure} from './inspectLegacySchoolStructure.mjs';

const acquisition = {
  status: 'legacy-reference-acquired',
  source: {
    repository: 'pinned-test-source',
    path: 'Brookhaven.rbxl',
    sourceCommit: 'abc123',
    sha256: 'a'.repeat(64),
    bytes: 12
  }
};

function fixture({schoolName = '001_School', includeSchool = true} = {}) {
  const school = {
    class: 'Model',
    name: schoolName,
    children: [{
      class: 'Model',
      name: 'SchoolDoorClassroom',
      children: [{
        class: 'Part',
        name: 'Door',
        properties: {
          CFrame: {CFrame: {position: [1, 2, 3]}},
          Size: {Vector3: [4, 5, 1]}
        }
      }]
    }]
  };
  return {
    class: 'DataModel',
    name: 'game',
    children: [{
      class: 'Workspace',
      name: 'Workspace',
      children: [{
        class: 'Folder',
        name: 'WorkspaceCom',
        children: [
          ...(includeSchool ? [school] : []),
          {
            class: 'Model',
            name: '003_SchoolLockers',
            children: [{class: 'Part', name: 'Door'}]
          }
        ]
      }]
    }]
  };
}

describe('pinned legacy school structure inspection', () => {
  it('reports exact school hierarchy and geometry without assigning room roles', () => {
    const report = inspectLegacySchoolStructure(fixture(), acquisition);
    expect(report.school.path).toBe('Workspace/WorkspaceCom/001_School');
    expect(report.school.geometryCount).toBe(1);
    expect(report.school.candidateGeometry[0].position).toEqual([1, 2, 3]);
    expect(report.interpretation.roomRoleAssignmentsVerified).toBe(false);
  });

  it('indexes classroom-door models found outside the named school control model', () => {
    const source = fixture();
    const workspace = source.children[0];
    workspace.children.push({
      class: 'Model',
      name: 'Model',
      children: [{
        class: 'Model',
        name: 'SchoolDoorClassroom',
        children: [{
          class: 'MeshPart',
          name: 'Door',
          properties: {
            CFrame: {CFrame: {position: [10, 2, 30]}},
            Size: {Vector3: [4, 5, 1]}
          }
        }]
      }]
    });
    workspace.children.push({
      class: 'Model',
      name: 'Model',
      children: [{
        class: 'Model',
        name: 'SchoolDoorClassroom',
        children: [{
          class: 'MeshPart',
          name: 'Door',
          properties: {
            CFrame: {CFrame: {position: [20, 2, 30]}},
            Size: {Vector3: [4, 5, 1]}
          }
        }]
      }]
    });
    const report = inspectLegacySchoolStructure(source, acquisition);
    const sourceDoors = report.school.schoolDoorModels;
    expect(sourceDoors).toHaveLength(3);
    expect(sourceDoors[1].path).toBe('Workspace/Model/SchoolDoorClassroom');
    expect(sourceDoors[2].path).toBe('Workspace/Model/SchoolDoorClassroom');
    expect(sourceDoors[1].parts[0].generatedName).toBe('LBH_00003');
    expect(sourceDoors[2].parts[0].generatedName).toBe('LBH_00004');
    expect(sourceDoors[1].parts[0].position).toEqual([10, 2, 30]);
    expect(sourceDoors[2].parts[0].position).toEqual([20, 2, 30]);
    expect(report.interpretation.roomRoleAssignmentsVerified).toBe(false);
  });

  it('ignores the similarly named school lockers model', () => {
    expect(() => inspectLegacySchoolStructure(
      fixture({schoolName: '003_SchoolLockers'}),
      acquisition
    )).toThrow(/expected one school model/);
  });

  it('fails closed when the pinned-source acquisition receipt is absent', () => {
    expect(() => inspectLegacySchoolStructure(fixture(), {status: 'unverified'}))
      .toThrow(/verified pinned legacy-source acquisition receipt/);
  });
});
