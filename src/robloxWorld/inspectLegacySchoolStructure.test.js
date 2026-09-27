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
