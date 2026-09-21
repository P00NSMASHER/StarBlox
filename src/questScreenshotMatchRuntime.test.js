// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { decorateQuestScreenshotMatch, parseQuestKicker, questMasteryLabel } from './questScreenshotMatchRuntime';

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

  it('is DOM-idempotent when the observer rescans an unchanged Quest', () => {
    document.body.innerHTML = `
      <section class="questPage"><div class="questBoard">
        <div class="questTop"><div><span class="kicker">STORY STREET · TRANSFER</span><h2>Story Inference</h2></div><span class="qCounter">1/5</span></div>
        <div class="questPhaseStrip"><div class="questPhase isActive"><b>Diagnose</b><small>Find your skill</small></div></div>
        <article class="questionCard">
          <section class="questLessonCard"><div class="questLessonCopy"><span class="questLessonLabel">READ</span></div></section>
          <div class="answers"><button class="answerButton">A thoughtful answer</button></div>
          <div class="questHintReady"><b>Old hint</b><span>Old hint copy</span></div>
        </article>
        <aside class="questEvidenceRail"><section class="questEvidenceCard"><span class="questRailKicker">Old mastery</span></section><section class="questTodayCard"><span class="questRailKicker">Old today</span></section></aside>
        <div class="questEarnedBar"><em>Old reward note</em></div>
      </div></section>`;
    const board = document.querySelector('.questBoard');
    expect(decorateQuestScreenshotMatch(board)).toBe(true);
    const first = board.innerHTML;
    expect(decorateQuestScreenshotMatch(board)).toBe(true);
    expect(board.innerHTML).toBe(first);
  });
});
