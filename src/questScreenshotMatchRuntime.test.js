import { describe, expect, it } from 'vitest';
import { parseQuestKicker, questMasteryLabel } from './questScreenshotMatchRuntime';

describe('Quest screenshot-match presentation helpers', () => {
  it('keeps district and pedagogical role visible in the breadcrumb', () => {
    expect(parseQuestKicker('STORY STREET · TRANSFER')).toEqual({
      district:'Story Street',
      role:'Transfer'
    });
    expect(parseQuestKicker('LANTERN LANE · DIAGNOSE')).toEqual({
      district:'Lantern Lane',
      role:'Diagnose'
    });
  });

  it('uses a reading-specific mastery heading only for reading evidence', () => {
    expect(questMasteryLabel('Story Inference')).toBe('READING MASTERY');
    expect(questMasteryLabel('Text Evidence')).toBe('READING MASTERY');
    expect(questMasteryLabel('Spelling')).toBe('SKILL MASTERY');
    expect(questMasteryLabel('Religion Application')).toBe('SKILL MASTERY');
  });
});
