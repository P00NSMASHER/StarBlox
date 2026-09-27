import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('Block 5: production original-equivalent schoolwork generation',()=>{
  it('rotates schoolwork surface examples deterministically from the certified source hash',()=>{
    const sync=read('scripts/sync-question-bank-from-abvm.mjs');

    expect(sync).toContain(
      "dynamic-abvm-star-sync-generator-v6-original-equivalent-schoolwork"
    );
    expect(sync).toContain('const schoolworkGenerationVariant=schoolworkSourceHash');
    expect(sync).toContain("slice(0,8),16)%2)+1");
    expect(sync).toContain('generationVariant:schoolworkGenerationVariant');
    expect(sync).toContain('schoolworkGenerationVariant,');
    expect(sync).toContain(
      "schoolworkPhotoSourceTransform:'skill-only-equivalent-item-v1'"
    );
  });

  it('includes transform metadata in question content hashing and output',()=>{
    const sync=read('scripts/sync-question-bank-from-abvm.mjs');

    expect(sync).toContain(
      "'responseType','richContent','experiment','generationVariant','sourceTransform','originalEquivalent'"
    );
    expect(sync).toContain('schoolworkPhotoGenerationMode:rawSchoolworkCatalog.generationMode');
    expect(sync).toContain('schoolworkPhotoGenerationVariant:rawSchoolworkCatalog.generationVariant');
  });

  it('passes only generator identity and variant into the equivalent-item factory',()=>{
    const pipeline=read('src/schoolworkPhoto/schoolworkPhotoPipeline.js');

    expect(pipeline).toContain(
      'const specs=buildEquivalentQuestionSpecs(signal.generatorKey,variant);'
    );
    expect(pipeline).not.toContain('buildEquivalentQuestionSpecs(enriched');
    expect(pipeline).not.toContain('buildEquivalentQuestionSpecs(pack');
    expect(pipeline).not.toContain('buildEquivalentQuestionSpecs(signal,');
  });

  it('makes private/raw worksheet fields unavailable inside the equivalent factory',()=>{
    const factory=read('src/schoolworkPhoto/schoolworkEquivalentItemFactory.js');

    for(const forbidden of [
      'pageRef',
      'rawText',
      'worksheetText',
      'studentResponse',
      'teacherMark',
      'imagePath',
      'imageHash',
      'fileName'
    ]){
      expect(factory).not.toContain(forbidden);
    }
  });

  it('keeps the Roblox store-art work out of this block',()=>{
    const changedSurface=[
      read('src/schoolworkPhoto/schoolworkEquivalentItemFactory.js'),
      read('src/schoolworkPhoto/schoolworkPhotoPipeline.js'),
      read('scripts/sync-question-bank-from-abvm.mjs')
    ].join('\n');
    expect(changedSurface).not.toContain('thumbnail');
    expect(changedSurface).not.toContain('experience icon');
  });
});
