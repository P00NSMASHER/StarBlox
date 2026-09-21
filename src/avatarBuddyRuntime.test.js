import { describe, expect, it } from 'vitest';
import { companionAsset, readAvatarPresentationState } from './avatarBuddyRuntime';

function fakeStorage(values = {}){
  return {
    getItem(key){ return Object.prototype.hasOwnProperty.call(values,key) ? values[key] : null; }
  };
}

describe('avatar buddy presentation state',() => {
  it('preserves exact equipped IDs from the current save',() => {
    const storage = fakeStorage({
      'starblox-save-v2': JSON.stringify({
        companionBond:7,
        equipped:{
          top:'tops-4',
          bottom:'bottoms-8',
          shoes:'shoes-11',
          head:'headwear-10',
          face:'facegear-2',
          back:'backgear-6',
          hand:'handgear-1',
          aura:'auras-5',
          companion:'companions-7'
        }
      })
    });

    expect(readAvatarPresentationState(storage)).toEqual({
      top:'tops-4',
      bottom:'bottoms-8',
      shoes:'shoes-11',
      head:'headwear-10',
      face:'facegear-2',
      back:'backgear-6',
      hand:'handgear-1',
      aura:'auras-5',
      companion:'companions-7',
      companionBond:7
    });
  });

  it('falls back safely without mutating save data',() => {
    expect(readAvatarPresentationState(fakeStorage())).toMatchObject({
      top:'tops-1',
      bottom:'bottoms-1',
      shoes:'shoes-1',
      companion:'companions-1'
    });
  });

  it('only resolves known StarBlox companion IDs to repo-owned catalog art',() => {
    expect(companionAsset('companions-12')).toBe('/assets/catalog/companions-12.svg');
    expect(companionAsset('companions-99')).toBe('/assets/catalog/companions-1.svg');
    expect(companionAsset('../outside')).toBe('/assets/catalog/companions-1.svg');
  });
});
