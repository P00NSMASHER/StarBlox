import { describe, expect, it } from 'vitest';
import { normalizeHomeDestination } from './homeScreenshotMatchRuntime';

describe('Home screenshot-match navigation aliases', () => {
  it('maps legacy Home destinations onto the shared five-item shell labels', () => {
    expect(normalizeHomeDestination('Market')).toBe('store');
    expect(normalizeHomeDestination('Quest')).toBe('quests');
    expect(normalizeHomeDestination('Avatar')).toBe('customize');
  });

  it('leaves already-compatible destinations unchanged', () => {
    expect(normalizeHomeDestination('Study')).toBe('study');
    expect(normalizeHomeDestination('Room')).toBe('room');
    expect(normalizeHomeDestination('Store')).toBe('store');
  });
});
