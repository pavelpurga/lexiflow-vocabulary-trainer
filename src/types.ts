export type Level = 'B1' | 'B1+' | 'B2';
export type Category = 'Everyday' | 'Work' | 'Technology' | 'Opinions' | 'Emotions' | 'Travel' | 'Phrasal verbs' | 'Expressions' | 'Linking words';
export type Skill = 'recognition' | 'production';
export type Rating = 1 | 2 | 3 | 4;

export interface Example { en: string; ru: string }
export interface WordCard {
  id: string; word: string; normalized: string; ipa: string; pos: string; level: Level; category: Category;
  translation: string; explanation: string; examples: Example[]; collocations: string[]; synonyms: string[];
  antonyms?: string[]; grammar?: string; note?: string; cloze: string; hint: string; accepted: string[]; custom?: boolean;
}

export interface SkillProgress {
  repetitions: number; interval: number; ease: number; due: string; lapses: number; lastRating?: Rating;
}
export interface CardProgress {
  recognition: SkillProgress; production: SkillProgress; favorite: boolean; known: boolean; suspended: boolean;
}
export interface ReviewEvent { cardId: string; skill: Skill; rating: Rating; at: string; previousInterval: number; nextInterval: number }
export interface Settings {
  dailyNew: number; dailyReviews: number; retention: number; level: Level; topics: Category[]; accent: 'en-GB' | 'en-US';
  explanation: 'ru' | 'en' | 'both'; sound: boolean; autoPlay: boolean; theme: 'light' | 'dark' | 'system'; interfaceLanguage: 'ru' | 'en';
}
export interface AppData {
  onboarded: boolean; settings: Settings; progress: Record<string, CardProgress>; history: ReviewEvent[]; customCards: WordCard[];
  activity: Record<string, number>; streak: number; lastStudyDate?: string; dailyGoal: number;
}

