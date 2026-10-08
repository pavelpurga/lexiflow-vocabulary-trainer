import type { Rating, SkillProgress } from '../types';

export const freshSkill = (): SkillProgress => ({ repetitions: 0, interval: 0, ease: 2.5, due: new Date(0).toISOString(), lapses: 0 });

// SM-2: the established SuperMemo scheduling model, with learning steps and a retention adjustment.
export function scheduleReview(current: SkillProgress, rating: Rating, retention = 0.9, now = new Date()): SkillProgress {
  let repetitions = current.repetitions;
  let interval = current.interval;
  let ease = current.ease;
  let lapses = current.lapses;
  const quality = ({ 1: 1, 2: 3, 3: 4, 4: 5 } as const)[rating];

  if (quality < 3) {
    repetitions = 0;
    interval = rating === 1 ? 0.007 : 0.7; // 10 minutes / later today
    ease = Math.max(1.3, ease - (rating === 1 ? 0.2 : 0.1));
    lapses += 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) interval = rating === 4 ? 4 : 1;
    else if (repetitions === 2) interval = rating === 4 ? 9 : 6;
    else interval = Math.max(1, Math.round(interval * ease * (rating === 4 ? 1.3 : 1)));
    ease = Math.max(1.3, ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  }
  // Higher target retention shortens intervals; lower targets lengthen them.
  interval = Math.max(0.007, interval * Math.max(0.65, Math.min(1.45, 0.9 / retention)));
  const due = new Date(now.getTime() + interval * 86400000).toISOString();
  return { repetitions, interval, ease, due, lapses, lastRating: rating };
}

export const isDue = (skill: SkillProgress, now = new Date()) => new Date(skill.due).getTime() <= now.getTime();
export const previewIntervals = (skill: SkillProgress, retention: number) => ([1, 2, 3, 4] as Rating[]).map(r => scheduleReview(skill, r, retention).interval);
export function formatInterval(days: number) {
  if (days < 0.03) return '10 мин';
  if (days < 1) return `${Math.max(1, Math.round(days * 24))} ч`;
  if (days < 30) return `${Math.round(days)} д`;
  if (days < 365) return `${Math.round(days / 30)} мес`;
  return `${(days / 365).toFixed(1)} г`;
}

