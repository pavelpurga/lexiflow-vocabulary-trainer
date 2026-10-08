import { describe, expect, it } from 'vitest';
import { freshSkill, isDue, scheduleReview } from './srs';

describe('SM-2 scheduler', () => {
  const now = new Date('2026-10-08T10:00:00.000Z');
  it('schedules a successful new card for tomorrow', () => {
    const next = scheduleReview(freshSkill(), 3, .9, now);
    expect(next.repetitions).toBe(1);
    expect(next.interval).toBeCloseTo(1);
    expect(next.due).toBe('2026-10-09T10:00:00.000Z');
  });
  it('shortens the interval and records a lapse after failure', () => {
    const mature = { repetitions: 5, interval: 30, ease: 2.5, due: now.toISOString(), lapses: 0 };
    const next = scheduleReview(mature, 1, .9, now);
    expect(next.repetitions).toBe(0);
    expect(next.interval).toBeLessThan(1);
    expect(next.lapses).toBe(1);
  });
  it('keeps recognition and production independently schedulable', () => {
    const recognition = scheduleReview(freshSkill(), 4, .9, now);
    const production = freshSkill();
    expect(recognition.repetitions).toBe(1);
    expect(production.repetitions).toBe(0);
  });
  it('handles due dates deterministically across timezone display changes', () => {
    expect(isDue({ ...freshSkill(), due: '2026-10-08T09:59:59.000Z' }, now)).toBe(true);
    expect(isDue({ ...freshSkill(), due: '2026-10-08T10:00:01.000Z' }, now)).toBe(false);
  });
});

