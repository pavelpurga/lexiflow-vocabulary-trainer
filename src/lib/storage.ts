import type { AppData, Settings, WordCard } from '../types';

const DB = 'lexiflow-db';
const STORE = 'app';
const KEY = 'state';

export const defaultSettings: Settings = {
  dailyNew: 12, dailyReviews: 80, retention: 0.9, level: 'B1+',
  topics: ['Everyday', 'Work', 'Technology', 'Phrasal verbs', 'Expressions'], accent: 'en-GB',
  explanation: 'both', sound: true, autoPlay: false, theme: 'light', interfaceLanguage: 'ru'
};
export const defaultData: AppData = { onboarded: false, settings: defaultSettings, progress: {}, history: [], customCards: [], activity: {}, streak: 0, dailyGoal: 20 };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function loadData(): Promise<AppData> {
  try {
    const db = await openDb();
    return await new Promise(resolve => {
      const req = db.transaction(STORE).objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(req.result ? { ...defaultData, ...req.result, settings: { ...defaultSettings, ...req.result.settings } } : defaultData);
      req.onerror = () => resolve(defaultData);
    });
  } catch { return defaultData; }
}
export async function saveData(data: AppData) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(data, KEY);
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  });
}
export function exportBackup(data: AppData) {
  const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), data }, null, 2)], { type: 'application/json' });
  download(blob, `lexiflow-backup-${new Date().toISOString().slice(0, 10)}.json`);
}
export function exportCsv(cards: WordCard[]) {
  const esc = (v: string) => `"${v.replaceAll('"', '""')}"`;
  const rows = [['word','translation','level','category','ipa','explanation'], ...cards.map(c => [c.word,c.translation,c.level,c.category,c.ipa,c.explanation])];
  download(new Blob(['\ufeff' + rows.map(r => r.map(esc).join(',')).join('\n')], { type: 'text/csv' }), 'lexiflow-vocabulary.csv');
}
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

