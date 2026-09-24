import { describe, expect, it } from 'vitest';
import {
  auditQuestionAdversarially,
  generateAntonymVariants,
  generateEntitySwapVariants
} from './adversarialQuestionQa.js';

describe('adversarial question QA', () => {
  it('creates counterfactual antonym variants without mutating the original', () => {
    const question = {
      prompt:'Which action shows care for the clean park?',
      choices:['Pick up litter.','Drop more litter.','Ignore the trash.'],
      answer:'Pick up litter.'
    };
    const variants = generateAntonymVariants(question);
    expect(variants.some(v => v.kind === 'antonym-swap')).toBe(true);
    expect(question.prompt).toBe('Which action shows care for the clean park?');
  });

  it('creates entity swaps when competing named entities exist', () => {
    const question = {
      prompt:'Why did Maya invite the new student?',
      choices:['Maya wanted to help.','Priya wanted to leave.','Mateo read a book.'],
      answer:'Maya wanted to help.'
    };
    const variants = generateEntitySwapVariants(question);
    expect(variants.length).toBe(1);
    expect(variants[0].from).toBe('Maya');
    expect(['Priya','Mateo']).toContain(variants[0].to);
  });

  it('hard-fails normalized duplicate choices while keeping heuristic findings separate', () => {
    const result = auditQuestionAdversarially({
      prompt:'Which answer is correct?',
      choices:['Yes',' yes ','No'],
      answer:'Yes'
    });
    expect(result.hardFindings.map(f => f.type)).toContain('normalized-duplicate-choice');
  });
});
