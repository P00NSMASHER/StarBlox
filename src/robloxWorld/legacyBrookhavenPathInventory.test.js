import {describe, expect, it} from 'vitest';
import {
  buildLegacyBrookhavenPathInventory,
  csvFromRows
} from './legacyBrookhavenPathInventory.js';

const node = (name, className, properties = {}, children = []) => ({
  name,
  class: className,
  properties,
  children
});

describe('legacy Brookhaven uncapped path inventory', () => {
  it('indexes every path without category caps and keeps duplicate names unique', () => {
    const lights = Array.from({length: 600}, () => node('Light', 'PointLight'));
    const dom = node('DataModel', 'DataModel', {}, [
      node('Workspace', 'Workspace', {}, [
        node('School', 'Model', {}, [
          ...lights,
          node('Icon', 'ImageLabel', {Image: 'rbxassetid://11'}),
          node('Bell', 'Sound', {SoundId: 'rbxassetid://22'}),
          node('Wave', 'Animation', {AnimationId: 'rbxassetid://33'}),
          node('Door', 'Part'),
          node('Door', 'Part')
        ])
      ])
    ]);

    const inventory = buildLegacyBrookhavenPathInventory(dom);
    expect(inventory.pathRows).toHaveLength(608);
    expect(new Set(inventory.pathRows.map(row => row.sourcePath)).size).toBe(608);
    expect(inventory.pathRows.filter(row => row.name === 'Light')).toHaveLength(600);
    expect(inventory.assetRows.map(row => row.assetKind).sort()).toEqual([
      'animation',
      'audio',
      'image'
    ]);
    expect(inventory.runtimeRows).toHaveLength(608);
    expect(inventory.runtimeRows.every(row =>
      row.status === 'unmapped' && row.gapReason === 'runtime-binding-not-yet-proven'
    )).toBe(true);
    expect(inventory.summary.sourceScriptsExecuted).toBe(false);
    expect(inventory.summary.sourceScriptsEvaluated).toBe(false);
    expect(inventory.summary.exactCurrentParityClaimAllowed).toBe(false);
  });

  it('emits quoted CSV suitable for the Step-2 ledgers', () => {
    const csv = csvFromRows([{id: 'PATH-1', name: 'School, Main'}], ['id', 'name']);
    expect(csv).toBe('id,name\n"PATH-1","School, Main"\n');
  });

  it('extracts rbx_dom_weak Variant-wrapped asset references', () => {
    const dom = node('DataModel', 'DataModel', {}, [
      node('Workspace', 'Workspace', {}, [
        node('Poster', 'Decal', {TextureContent: {ContentId: 'rbxassetid://101'}}),
        node('Theme', 'Sound', {AudioContent: {ContentId: 'rbxassetid://202'}}),
        node('Dance', 'Animation', {AnimationContent: {ContentId: 'rbxassetid://303'}}),
        node('Statue', 'MeshPart', {
          MeshContent: {ContentId: 'rbxassetid://404'},
          TextureContent: {Content: {uri: 'rbxassetid://505'}}
        })
      ])
    ]);

    const inventory = buildLegacyBrookhavenPathInventory(dom);
    expect(inventory.assetRows.map(row => row.reference)).toEqual([
      'rbxassetid://101',
      'rbxassetid://202',
      'rbxassetid://303',
      'rbxassetid://404',
      'rbxassetid://505'
    ]);
    expect(inventory.summary.countsByAssetKind).toEqual({
      animation: 1,
      audio: 1,
      image: 2,
      mesh: 1
    });
    expect(inventory.summary.assetPropertyKeysByClass).toEqual({
      Animation: ['AnimationContent'],
      Decal: ['TextureContent'],
      MeshPart: ['MeshContent', 'TextureContent'],
      Sound: ['AudioContent']
    });
  });
});
