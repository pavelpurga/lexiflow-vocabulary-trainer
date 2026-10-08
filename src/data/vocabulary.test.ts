import { describe, expect, it } from 'vitest';
import { vocabulary } from './vocabulary';

describe('starter vocabulary', () => {
  it('contains a substantial curated starter set', () => {
    expect(vocabulary.length).toBeGreaterThanOrEqual(100);
  });
  it('has unique ids and normalized forms', () => {
    expect(new Set(vocabulary.map(card => card.id)).size).toBe(vocabulary.length);
    expect(new Set(vocabulary.map(card => card.normalized)).size).toBe(vocabulary.length);
  });
  it('contains the required learning fields', () => {
    for (const card of vocabulary) {
      expect(card.word).toBeTruthy();
      expect(card.translation).toBeTruthy();
      expect(card.explanation.length).toBeGreaterThan(15);
      expect(card.examples.length).toBeGreaterThanOrEqual(2);
      expect(card.cloze).toContain('_____');
      expect(card.accepted.length).toBeGreaterThan(0);
    }
  });
});
