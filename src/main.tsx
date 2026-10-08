import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  LayoutDashboard, BookOpen, RotateCcw, Library, ChartNoAxesCombined, Settings as SettingsIcon, Flame,
  Volume2, Sparkles, ArrowRight, Clock3, Target, ChevronRight, Brain, Search, SlidersHorizontal, Star,
  Plus, MoreHorizontal, Moon, Sun, Download, Upload, Check, X, Headphones, PenLine, Languages,
  Zap, CalendarDays, Trophy, CircleHelp, Menu, WifiOff, RotateCw, Trash2, Edit3, Eye, Keyboard,
  ShieldCheck, Database, BellRing, Gauge, BookMarked, Play, Pause, CheckCircle2
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from 'recharts';
import type { AppData, CardProgress, Category, Level, Rating, Settings, Skill, WordCard } from './types';
import { categories, vocabulary } from './data/vocabulary';
import { defaultData, exportBackup, exportCsv, loadData, saveData } from './lib/storage';
import { formatInterval, freshSkill, isDue, previewIntervals, scheduleReview } from './lib/srs';
import './styles.css';

type View = 'dashboard' | 'learn' | 'review' | 'vocabulary' | 'progress' | 'settings';
type Mode = 'cards' | 'production' | 'cloze' | 'listening';

const nav: { id: View; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Главная', icon: LayoutDashboard }, { id: 'learn', label: 'Учить', icon: BookOpen },
  { id: 'review', label: 'Повторить', icon: RotateCcw }, { id: 'vocabulary', label: 'Словарь', icon: Library },
  { id: 'progress', label: 'Прогресс', icon: ChartNoAxesCombined }, { id: 'settings', label: 'Настройки', icon: SettingsIcon },
];

const todayKey = () => new Date().toISOString().slice(0, 10);
const freshProgress = (): CardProgress => ({ recognition: freshSkill(), production: freshSkill(), favorite: false, known: false, suspended: false });
const normalize = (s: string) => s.toLowerCase().trim().replace(/[’']/g, "'").replace(/\s+/g, ' ').replace(/[.!?,;:]$/g, '');
const levelRank = (level: Level) => ({ B1: 1, 'B1+': 2, B2: 3 })[level];

function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [view, setView] = useState<View>((location.hash.slice(1) as View) || 'dashboard');
  const [toast, setToast] = useState('');
  const allCards = useMemo(() => [...vocabulary, ...(data?.customCards || [])], [data?.customCards]);
  const dueCount = data ? allCards.filter(c => data.progress[c.id] && (isDue(data.progress[c.id].recognition) || isDue(data.progress[c.id].production))).length : 0;

  useEffect(() => { loadData().then(setData); }, []);
  useEffect(() => { if (data) saveData(data); }, [data]);
  useEffect(() => {
    const handler = () => setView((location.hash.slice(1) as View) || 'dashboard');
    addEventListener('hashchange', handler); return () => removeEventListener('hashchange', handler);
  }, []);
  useEffect(() => {
    if (!data) return;
    const root = document.documentElement;
    const dark = data.settings.theme === 'dark' || (data.settings.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    root.dataset.theme = dark ? 'dark' : 'light';
  }, [data?.settings.theme]);
  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }, []);

  function navigate(next: View) { location.hash = next; setView(next); window.scrollTo({ top: 0 }); }
  function flash(message: string) { setToast(message); window.setTimeout(() => setToast(''), 2600); }
  if (!data) return <div className="loading-screen"><div className="brand-mark">L</div><div className="loading-bar"><span /></div><p>Готовим вашу тренировку…</p></div>;
  if (!data.onboarded) return <Onboarding data={data} onFinish={(next) => setData({ ...next, onboarded: true })} />;

  return <div className="app-shell">
    <Sidebar view={view} navigate={navigate} streak={data.streak} due={dueCount} />
    <main className="main-area">
      <TopBar view={view} navigate={navigate} data={data} setData={setData} />
      {view === 'dashboard' && <Dashboard data={data} allCards={allCards} navigate={navigate} />}
      {(view === 'learn' || view === 'review') && <Study initialReview={view === 'review'} data={data} setData={setData} cards={allCards} flash={flash} navigate={navigate} />}
      {view === 'vocabulary' && <Vocabulary data={data} setData={setData} cards={allCards} flash={flash} />}
      {view === 'progress' && <Progress data={data} cards={allCards} />}
      {view === 'settings' && <SettingsPage data={data} setData={setData} cards={allCards} flash={flash} />}
    </main>
    <MobileNav view={view} navigate={navigate} />
    {toast && <div className="toast"><CheckCircle2 size={18} />{toast}</div>}
  </div>;
}

function Sidebar({ view, navigate, streak, due }: { view: View; navigate: (v: View) => void; streak: number; due: number }) {
  return <aside className="sidebar">
    <button className="logo" onClick={() => navigate('dashboard')}><span className="brand-mark">L</span><span>LexiFlow</span></button>
    <nav>{nav.map(item => <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => navigate(item.id)}><item.icon size={20} /><span>{item.label}</span>{item.id === 'review' && due > 0 && <i>{due}</i>}</button>)}</nav>
    <div className="streak-card"><div className="streak-icon"><Flame size={22} /></div><div><b>{streak} дней подряд</b><small>{streak ? 'Продолжайте в том же духе!' : 'Начните первую тренировку'}</small></div></div>
    <div className="user-card"><div className="avatar">АП</div><div><b>Мой профиль</b><small>Уровень B1+</small></div><MoreHorizontal size={18} /></div>
  </aside>;
}

function MobileNav({ view, navigate }: { view: View; navigate: (v: View) => void }) {
  return <nav className="mobile-nav">{nav.slice(0, 5).map(item => <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => navigate(item.id)}><item.icon size={20} /><span>{item.label}</span></button>)}</nav>;
}

function TopBar({ view, navigate, data, setData }: { view: View; navigate: (v: View) => void; data: AppData; setData: (d: AppData) => void }) {
  const titles: Record<View,string> = { dashboard: 'Главная', learn: 'Учебная сессия', review: 'Повторение', vocabulary: 'Мой словарь', progress: 'Прогресс', settings: 'Настройки' };
  const dark = data.settings.theme === 'dark';
  return <header className="topbar"><div><span className="mobile-logo"><span className="brand-mark">L</span></span><h1>{titles[view]}</h1></div><div className="top-actions"><span className="offline-pill"><WifiOff size={14} /> Работает офлайн</span><button className="icon-btn" aria-label="Сменить тему" onClick={() => setData({ ...data, settings: { ...data.settings, theme: dark ? 'light' : 'dark' } })}>{dark ? <Sun size={19} /> : <Moon size={19} />}</button><button className="icon-btn" aria-label="Настройки" onClick={() => navigate('settings')}><SettingsIcon size={19} /></button></div></header>;
}

function Dashboard({ data, allCards, navigate }: { data: AppData; allCards: WordCard[]; navigate: (v: View) => void }) {
  const studied = Object.values(data.progress).filter(p => p.recognition.repetitions > 0 || p.production.repetitions > 0).length;
  const mastered = Object.values(data.progress).filter(p => p.recognition.interval >= 21 && p.production.interval >= 14).length;
  const active = Object.values(data.progress).filter(p => p.production.repetitions > 0).length;
  const due = allCards.filter(c => data.progress[c.id] && (isDue(data.progress[c.id].recognition) || isDue(data.progress[c.id].production))).length;
  const today = data.activity[todayKey()] || 0;
  const goalPct = Math.min(100, Math.round(today / data.dailyGoal * 100));
  const newCount = Math.min(data.settings.dailyNew, allCards.filter(c => !data.progress[c.id]).length);
  const activity = recentDays(14).map(day => ({ day: day.label, reviews: data.activity[day.key] || 0 }));
  return <div className="page dashboard-page">
    <section className="hero-grid">
      <div className="hero-card">
        <div className="eyebrow"><Sparkles size={15} /> Умная сессия на сегодня</div>
        <h2>Добрый день!<br/><span>Готовы сделать ещё один шаг?</span></h2>
        <p>Мы собрали персональную тренировку: сначала просроченные повторения, затем новая лексика и активное воспроизведение.</p>
        <div className="hero-stats"><div><RotateCcw size={18}/><span><b>{due}</b> повторить</span></div><div><BookOpen size={18}/><span><b>{newCount}</b> новых</span></div><div><Clock3 size={18}/><span><b>~{Math.max(8, Math.ceil((due + newCount) * .7))}</b> минут</span></div></div>
        <button className="primary-btn dark" onClick={() => navigate(due ? 'review' : 'learn')}><Play size={18} fill="currentColor"/> Начать тренировку <ArrowRight size={18}/></button>
        <div className="hero-curve" />
      </div>
      <div className="goal-card card"><div className="card-heading"><div><span className="eyebrow subtle">Дневная цель</span><h3>{today} из {data.dailyGoal} упражнений</h3></div><Target size={22}/></div><div className="goal-ring" style={{ '--pct': `${goalPct * 3.6}deg` } as React.CSSProperties}><div><b>{goalPct}%</b><small>готово</small></div></div><div className="progress-track"><span style={{ width: `${goalPct}%` }} /></div><p>{goalPct < 100 ? `Ещё ${Math.max(0, data.dailyGoal - today)} заданий — и цель выполнена.` : 'Отлично! Дневная цель выполнена.'}</p></div>
    </section>
    <section className="stat-grid">
      <Stat icon={Brain} color="lime" label="В изучении" value={studied} delta="единиц лексики" />
      <Stat icon={Trophy} color="violet" label="Устойчиво усвоено" value={mastered} delta="интервал 2+ недели" />
      <Stat icon={Languages} color="blue" label="Активный словарь" value={active} delta={`${Math.round(active / Math.max(1, studied) * 100)}% от изучаемого`} />
      <Stat icon={Flame} color="orange" label="Серия" value={`${data.streak} дн.`} delta="лучший ритм — ежедневно" />
    </section>
    <section className="dashboard-bottom">
      <div className="card activity-card"><div className="card-heading"><div><span className="eyebrow subtle">Активность</span><h3>Последние 14 дней</h3></div><button className="text-btn" onClick={() => navigate('progress')}>Вся статистика <ChevronRight size={16}/></button></div><ResponsiveContainer width="100%" height={190}><AreaChart data={activity}><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#9bc53d" stopOpacity={.45}/><stop offset="95%" stopColor="#9bc53d" stopOpacity={0}/></linearGradient></defs><CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--line)"/><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill:'var(--muted)',fontSize:11}}/><Tooltip contentStyle={{borderRadius:12,border:'1px solid var(--line)',background:'var(--panel)'}}/><Area type="monotone" dataKey="reviews" stroke="#82a934" strokeWidth={3} fill="url(#area)"/></AreaChart></ResponsiveContainer></div>
      <div className="card focus-card"><div className="card-heading"><div><span className="eyebrow subtle">Сегодня в фокусе</span><h3>Активное воспроизведение</h3></div><div className="focus-icon"><Zap size={20}/></div></div><p>Переводите смысл в собственную речь. Это помогает перенести лексику из пассивного запаса в активный.</p><div className="mini-card"><span>B2 · Expression</span><b>take into account</b><small>принимать во внимание</small></div><button className="secondary-btn" onClick={() => navigate('learn')}>Практиковаться <ArrowRight size={17}/></button></div>
    </section>
  </div>;
}

function Stat({ icon: Icon, color, label, value, delta }: { icon: React.ElementType; color: string; label: string; value: string|number; delta: string }) {
  return <div className="card stat-card"><div className={`stat-icon ${color}`}><Icon size={21}/></div><div><span>{label}</span><strong>{value}</strong><small>{delta}</small></div></div>;
}

function Study({ initialReview, data, setData, cards, flash, navigate }: { initialReview: boolean; data: AppData; setData: (d: AppData) => void; cards: WordCard[]; flash: (s:string)=>void; navigate:(v:View)=>void }) {
  const [mode, setMode] = useState<Mode>(initialReview ? 'cards' : 'cards');
  const [index, setIndex] = useState(0); const [revealed, setRevealed] = useState(false); const [answer, setAnswer] = useState(''); const [checked, setChecked] = useState<'ok'|'bad'|null>(null); const [listeningPlayed, setListeningPlayed] = useState(false);
  const [sessionDone, setSessionDone] = useState(0); const inputRef = useRef<HTMLInputElement>(null);
  const skill: Skill = mode === 'cards' ? 'recognition' : 'production';
  const queue = useMemo(() => {
    const eligible = cards.filter(c => data.settings.topics.includes(c.category) && levelRank(c.level) <= levelRank(data.settings.level) + (data.settings.level === 'B2' ? 0 : 1) && !data.progress[c.id]?.suspended);
    const due = eligible.filter(c => data.progress[c.id] && isDue(data.progress[c.id][skill])).sort((a,b) => new Date(data.progress[a.id][skill].due).getTime() - new Date(data.progress[b.id][skill].due).getTime());
    const fresh = eligible.filter(c => !data.progress[c.id] || data.progress[c.id][skill].repetitions === 0).slice(0, data.settings.dailyNew);
    return initialReview ? due.slice(0, data.settings.dailyReviews) : [...due, ...fresh.filter(f => !due.some(d => d.id === f.id))].slice(0, Math.max(12, data.settings.dailyNew + 8));
  }, [cards, data.progress, data.settings, skill, initialReview]);
  const card = queue[index % Math.max(1, queue.length)];
  const progress = card ? data.progress[card.id] || freshProgress() : freshProgress();
  const intervals = previewIntervals(progress[skill], data.settings.retention);

  useEffect(() => { setIndex(0); setRevealed(false); setAnswer(''); setChecked(null); }, [mode]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!card) return;
      if (e.code === 'Space' && mode === 'cards') { e.preventDefault(); setRevealed(true); }
      if (revealed && ['1','2','3','4'].includes(e.key)) rate(Number(e.key) as Rating);
      if (e.key === 'Enter' && mode !== 'cards' && !checked) checkAnswer();
    };
    addEventListener('keydown', handler); return () => removeEventListener('keydown', handler);
  });

  function speak(text: string) {
    if (!data.settings.sound || !('speechSynthesis' in window)) { flash('Голос синтеза речи недоступен в этом браузере'); return; }
    speechSynthesis.cancel(); const utter = new SpeechSynthesisUtterance(text); utter.lang = data.settings.accent; utter.rate = .88; speechSynthesis.speak(utter); setListeningPlayed(true);
  }
  function checkAnswer() {
    if (!card || !answer.trim()) return;
    const variants = card.accepted.map(normalize); const value = normalize(answer);
    const ok = variants.some(v => value === v || (value.length > 6 && levenshtein(value, v) <= 1));
    setChecked(ok ? 'ok' : 'bad'); setRevealed(true);
  }
  function rate(rating: Rating) {
    if (!card) return;
    const old = data.progress[card.id] || freshProgress(); const before = old[skill]; const nextSkill = scheduleReview(before, rating, data.settings.retention);
    const now = new Date(); const key = todayKey(); let streak = data.streak || 0;
    if (data.lastStudyDate !== key) {
      const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
      streak = data.lastStudyDate === yesterday.toISOString().slice(0,10) ? streak + 1 : 1;
    }
    const next = { ...data, progress: { ...data.progress, [card.id]: { ...old, [skill]: nextSkill } }, history: [...data.history, { cardId: card.id, skill, rating, at: now.toISOString(), previousInterval: before.interval, nextInterval: nextSkill.interval }].slice(-3000), activity: { ...data.activity, [key]: (data.activity[key] || 0) + 1 }, streak, lastStudyDate: key };
    setData(next); setSessionDone(v => v + 1); setIndex(v => v + 1); setRevealed(false); setAnswer(''); setChecked(null); setListeningPlayed(false); window.setTimeout(() => inputRef.current?.focus(), 60);
  }
  if (!card) return <div className="page empty-state"><div className="empty-icon"><Trophy size={30}/></div><h2>Всё повторено!</h2><p>На сегодня нет карточек, ожидающих повторения. Можно изучить новые слова или вернуться завтра.</p><button className="primary-btn" onClick={() => navigate('learn')}>Учить новые слова</button></div>;
  const question = mode === 'production' ? card.translation : mode === 'cloze' ? card.cloze : card.word;
  return <div className="study-page">
    <div className="study-top"><button className="close-session" onClick={() => navigate('dashboard')}><X size={20}/></button><div className="session-progress"><div><span>{initialReview ? 'Повторение' : 'Умная сессия'}</span><b>{Math.min(index + 1, queue.length)} / {queue.length}</b></div><div className="progress-track"><span style={{width:`${Math.min(100,(index / Math.max(1,queue.length))*100)}%`}}/></div></div><div className="session-score"><Zap size={17}/>{sessionDone * 10} XP</div></div>
    <div className="mode-tabs"><button className={mode==='cards'?'active':''} onClick={()=>setMode('cards')}><Eye size={17}/> Карточки</button><button className={mode==='production'?'active':''} onClick={()=>setMode('production')}><Languages size={17}/> RU → EN</button><button className={mode==='cloze'?'active':''} onClick={()=>setMode('cloze')}><PenLine size={17}/> Пропуски</button><button className={mode==='listening'?'active':''} onClick={()=>setMode('listening')}><Headphones size={17}/> Аудирование</button></div>
    <div className="study-wrap">
      <div className={`flashcard ${revealed ? 'revealed' : ''}`}>
        <div className="card-meta"><span className={`level ${card.level.replace('+','p')}`}>{card.level}</span><span>{card.category}</span><button className="star-btn" onClick={() => setData({ ...data, progress: { ...data.progress, [card.id]: { ...progress, favorite: !progress.favorite } } })}><Star size={19} fill={progress.favorite?'currentColor':'none'}/></button></div>
        {mode === 'listening' && !revealed ? <div className="listening-prompt"><button className={`listen-big ${listeningPlayed?'played':''}`} onClick={()=>speak(card.word)}><Volume2 size={30}/></button><h2>{listeningPlayed ? 'Что вы услышали?' : 'Нажмите, чтобы прослушать'}</h2><p>Введите английское слово или выражение</p></div> : <>
          <span className="prompt-label">{mode==='cards'?'Вспомните значение':mode==='production'?'Переведите на английский':mode==='cloze'?'Заполните пропуск':'Проверьте написание'}</span>
          <h2 className={mode==='cloze'?'cloze-text':''}>{question}</h2>
          {mode==='cards' && <><div className="pronunciation"><span>{card.ipa}</span><button onClick={()=>speak(card.word)}><Volume2 size={19}/></button></div><span className="pos">{card.pos}</span><blockquote>“{card.examples[0].en}”</blockquote></>}
        </>}
        {mode !== 'cards' && !revealed && <div className="answer-box"><div><input ref={inputRef} autoFocus value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Введите ответ…" aria-label="Ваш ответ"/><span>Enter ↵</span></div><small><CircleHelp size={14}/> Подсказка: {card.hint}</small><button className="primary-btn" disabled={!answer.trim()} onClick={checkAnswer}>Проверить ответ</button></div>}
        {mode === 'cards' && !revealed && <button className="reveal-btn" onClick={()=>setRevealed(true)}>Показать ответ <span>Space</span></button>}
        {revealed && <div className="answer-panel">
          {mode !== 'cards' && <div className={`answer-result ${checked}`}><div>{checked==='ok'?<Check size={18}/>:<X size={18}/>}</div><span>{checked==='ok'?'Верно!':'Правильный ответ'}<b>{card.word}</b>{checked==='bad'&&<small>Ваш ответ: {answer}</small>}</span></div>}
          <div className="translation"><span>Перевод</span><b>{card.translation}</b></div>
          {(data.settings.explanation === 'en' || data.settings.explanation === 'both') && <p className="explanation"><strong>Meaning</strong>{card.explanation}</p>}
          <div className="example-list"><strong>Примеры в контексте</strong>{card.examples.slice(0,2).map((ex,i)=><div key={i}><span>{i+1}</span><p><b>{ex.en}</b>{data.settings.explanation!=='en'&&<small>{ex.ru}</small>}</p><button onClick={()=>speak(ex.en)}><Volume2 size={17}/></button></div>)}</div>
          <div className="word-details"><div><span>Collocations</span>{card.collocations.map(v=><i key={v}>{v}</i>)}</div><div><span>Synonyms</span>{card.synonyms.map(v=><i key={v}>{v}</i>)}</div></div>
          {card.grammar && <div className="usage-note"><CircleHelp size={17}/><p><b>Обратите внимание</b>{card.grammar}</p></div>}
        </div>}
      </div>
      {revealed && <div className="rating-area"><p>Насколько легко вы вспомнили?</p><div className="rating-grid">{(['Снова','Трудно','Хорошо','Легко'] as const).map((label,i)=><button key={label} className={`rating r${i+1}`} onClick={()=>rate((i+1) as Rating)}><span>{i+1}</span><b>{label}</b><small>{formatInterval(intervals[i])}</small></button>)}</div><small className="shortcut-hint"><Keyboard size={14}/> Используйте клавиши 1–4 для быстрой оценки</small></div>}
    </div>
  </div>;
}

function Vocabulary({ data, setData, cards, flash }: { data: AppData; setData:(d:AppData)=>void; cards:WordCard[]; flash:(s:string)=>void }) {
  const [query,setQuery]=useState(''); const [level,setLevel]=useState<'all'|Level>('all'); const [category,setCategory]=useState<'all'|Category>('all'); const [status,setStatus]=useState('all'); const [addOpen,setAddOpen]=useState(false); const [selected,setSelected]=useState<WordCard|null>(null);
  const filtered = cards.filter(c => {
    const p=data.progress[c.id]; const state=!p?'new':p.recognition.interval>=21?'mastered':'learning';
    return (normalize(c.word).includes(normalize(query)) || normalize(c.translation).includes(normalize(query))) && (level==='all'||c.level===level) && (category==='all'||c.category===category) && (status==='all'||state===status||(status==='favorite'&&p?.favorite));
  });
  function toggleFav(card:WordCard){const p=data.progress[card.id]||freshProgress();setData({...data,progress:{...data.progress,[card.id]:{...p,favorite:!p.favorite}}});}
  function remove(card:WordCard){if(!card.custom)return;setData({...data,customCards:data.customCards.filter(c=>c.id!==card.id)});setSelected(null);flash('Пользовательская карточка удалена');}
  return <div className="page vocabulary-page"><div className="page-intro"><div><p>Ваша персональная коллекция</p><h2>{cards.length} слов и выражений</h2><span>Ищите, фильтруйте и управляйте своей лексикой.</span></div><button className="primary-btn" onClick={()=>setAddOpen(true)}><Plus size={18}/> Добавить слово</button></div>
    <div className="library-toolbar card"><div className="search-box"><Search size={19}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Найти слово или перевод…"/></div><select value={level} onChange={e=>setLevel(e.target.value as typeof level)}><option value="all">Все уровни</option><option>B1</option><option>B1+</option><option>B2</option></select><select value={category} onChange={e=>setCategory(e.target.value as typeof category)}><option value="all">Все категории</option>{categories.map(c=><option key={c}>{c}</option>)}</select><select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">Все статусы</option><option value="new">Новые</option><option value="learning">В изучении</option><option value="mastered">Усвоены</option><option value="favorite">Избранное</option></select><button className="icon-btn"><SlidersHorizontal size={18}/></button></div>
    <div className="table-card card"><div className="table-head"><span>Слово / выражение</span><span>Уровень и тема</span><span>Прогресс</span><span>Следующее повторение</span><span /></div>{filtered.slice(0,80).map(card=>{const p=data.progress[card.id];const pct=!p?0:Math.min(100,Math.round((p.recognition.interval+p.production.interval)*2));return <button className="word-row" key={card.id} onClick={()=>setSelected(card)}><div><button className="star-inline" onClick={e=>{e.stopPropagation();toggleFav(card)}}><Star size={17} fill={p?.favorite?'currentColor':'none'}/></button><span><b>{card.word}</b><small>{card.translation}</small></span></div><div><span className={`level ${card.level.replace('+','p')}`}>{card.level}</span><small>{card.category}</small></div><div><div className="mini-progress"><span style={{width:`${pct}%`}}/></div><small>{pct ? `${pct}%` : 'Новое'}</small></div><div><CalendarDays size={15}/><small>{!p?'Не запланировано':isDue(p.recognition)?'Сегодня':new Date(p.recognition.due).toLocaleDateString('ru-RU',{day:'numeric',month:'short'})}</small></div><ChevronRight size={18}/></button>})}{!filtered.length&&<div className="empty-table"><Search size={28}/><b>Ничего не найдено</b><span>Попробуйте изменить запрос или фильтры.</span></div>}</div>
    {addOpen&&<AddCard onClose={()=>setAddOpen(false)} onAdd={card=>{setData({...data,customCards:[card,...data.customCards]});setAddOpen(false);flash('Карточка добавлена в словарь');}}/>}
    {selected&&<WordDrawer card={selected} progress={data.progress[selected.id]} close={()=>setSelected(null)} toggleFav={()=>toggleFav(selected)} reset={()=>{const next={...data.progress};delete next[selected.id];setData({...data,progress:next});flash('Прогресс карточки сброшен');}} remove={()=>remove(selected)}/>} 
  </div>;
}

function WordDrawer({card,progress,close,toggleFav,reset,remove}:{card:WordCard;progress?:CardProgress;close:()=>void;toggleFav:()=>void;reset:()=>void;remove:()=>void}) {
  return <div className="modal-backdrop" onMouseDown={close}><aside className="word-drawer" onMouseDown={e=>e.stopPropagation()}><div className="drawer-top"><span className={`level ${card.level.replace('+','p')}`}>{card.level}</span><div><button onClick={toggleFav}><Star size={19} fill={progress?.favorite?'currentColor':'none'}/></button><button onClick={close}><X size={20}/></button></div></div><h2>{card.word}</h2><p className="ipa">{card.ipa} · {card.pos}</p><h4>Перевод</h4><p>{card.translation}</p><h4>Meaning</h4><p>{card.explanation}</p><h4>Примеры</h4>{card.examples.map((e,i)=><div className="drawer-example" key={i}><b>{e.en}</b><small>{e.ru}</small></div>)}<h4>Статус обучения</h4><div className="drawer-stats"><div><span>Распознавание</span><b>{progress?.recognition.repetitions||0} повт.</b></div><div><span>Активное владение</span><b>{progress?.production.repetitions||0} повт.</b></div></div><button className="secondary-btn full" onClick={reset}><RotateCw size={17}/> Сбросить прогресс</button>{card.custom&&<button className="danger-btn" onClick={remove}><Trash2 size={17}/> Удалить карточку</button>}</aside></div>;
}

function AddCard({onClose,onAdd}:{onClose:()=>void;onAdd:(c:WordCard)=>void}) {
  const [word,setWord]=useState(''); const [translation,setTranslation]=useState(''); const [example,setExample]=useState(''); const [level,setLevel]=useState<Level>('B1+'); const [category,setCategory]=useState<Category>('Everyday');
  function submit(e:React.FormEvent){e.preventDefault();if(!word.trim()||!translation.trim()||!example.trim())return;onAdd({id:`custom-${Date.now()}`,word:word.trim(),normalized:normalize(word),ipa:'',pos:'phrase',level,category,translation:translation.trim(),explanation:`A custom vocabulary item: ${word.trim()}.`,examples:[{en:example.trim(),ru:translation.trim()}],collocations:[],synonyms:[],cloze:example.replace(new RegExp(word,'i'),'_____'),hint:translation,accepted:[word.trim()],custom:true});}
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}><div className="modal-title"><div><span className="eyebrow subtle">Личный словарь</span><h2>Новая карточка</h2></div><button type="button" onClick={onClose}><X/></button></div><label>Английское слово или выражение<input autoFocus value={word} onChange={e=>setWord(e.target.value)} placeholder="e.g. follow through" required/></label><label>Перевод<input value={translation} onChange={e=>setTranslation(e.target.value)} placeholder="Довести до конца" required/></label><label>Контекстное предложение<textarea value={example} onChange={e=>setExample(e.target.value)} placeholder="Make sure you follow through on your promise." required/></label><div className="form-row"><label>Уровень<select value={level} onChange={e=>setLevel(e.target.value as Level)}><option>B1</option><option>B1+</option><option>B2</option></select></label><label>Категория<select value={category} onChange={e=>setCategory(e.target.value as Category)}>{categories.map(c=><option key={c}>{c}</option>)}</select></label></div><button className="primary-btn full" type="submit">Добавить карточку</button></form></div>;
}

function Progress({data,cards}:{data:AppData;cards:WordCard[]}) {
  const events=data.history; const total=Object.keys(data.progress).length; const mastered=Object.values(data.progress).filter(p=>p.recognition.interval>=21&&p.production.interval>=14).length; const recognition=Object.values(data.progress).filter(p=>p.recognition.repetitions>0).length; const production=Object.values(data.progress).filter(p=>p.production.repetitions>0).length;
  const retention=events.length?Math.round(events.filter(e=>e.rating>=3).length/events.length*100):0;
  const chart=recentDays(30).map(d=>({day:d.short,reviews:events.filter(e=>e.at.slice(0,10)===d.key).length,good:events.filter(e=>e.at.slice(0,10)===d.key&&e.rating>=3).length}));
  const weak=cards.map(c=>({card:c,p:data.progress[c.id]})).filter(x=>x.p&&x.p.recognition.lapses+x.p.production.lapses>0).sort((a,b)=>(b.p!.recognition.lapses+b.p!.production.lapses)-(a.p!.recognition.lapses+a.p!.production.lapses)).slice(0,5);
  const catStats=categories.map(category=>({category,count:cards.filter(c=>c.category===category&&data.progress[c.id]).length,lapses:cards.filter(c=>c.category===category).reduce((n,c)=>n+(data.progress[c.id]?.recognition.lapses||0)+(data.progress[c.id]?.production.lapses||0),0)})).filter(x=>x.count).sort((a,b)=>b.lapses-a.lapses);
  return <div className="page progress-page"><div className="page-intro"><div><p>Объективная аналитика</p><h2>Ваш прогресс</h2><span>Здесь нет выдуманного «уровня» — только данные по реальным повторениям.</span></div><div className="date-pill"><CalendarDays size={17}/> Последние 30 дней</div></div><div className="stat-grid progress-stats"><Stat icon={BookMarked} color="blue" label="В словаре" value={total} delta={`${mastered} устойчиво усвоено`}/><Stat icon={Eye} color="violet" label="Узнавание" value={recognition} delta="пассивный словарь"/><Stat icon={Languages} color="lime" label="Воспроизведение" value={production} delta="активный словарь"/><Stat icon={Target} color="orange" label="Удержание" value={`${retention || '—'}%`} delta={`цель ${Math.round(data.settings.retention*100)}%`}/></div>
    <div className="progress-grid"><div className="card chart-card"><div className="card-heading"><div><span className="eyebrow subtle">Динамика</span><h3>Повторения за месяц</h3></div><span className="chart-legend"><i/> Повторения</span></div><ResponsiveContainer width="100%" height={270}><BarChart data={chart}><CartesianGrid vertical={false} stroke="var(--line)"/><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill:'var(--muted)',fontSize:10}} interval={4}/><YAxis axisLine={false} tickLine={false} tick={{fill:'var(--muted)',fontSize:10}}/><Tooltip contentStyle={{borderRadius:12,border:'1px solid var(--line)',background:'var(--panel)'}}/><Bar dataKey="reviews" fill="#a8d24d" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div><div className="card retention-card"><span className="eyebrow subtle">Качество памяти</span><h3>Оценка удержания</h3><div className="retention-ring" style={{'--pct':`${retention*3.6}deg`} as React.CSSProperties}><div><b>{retention||0}%</b><small>{events.length} ответов</small></div></div><div className="retention-list"><span><i className="good"/> Успешно <b>{events.filter(e=>e.rating>=3).length}</b></span><span><i className="hard"/> Трудно <b>{events.filter(e=>e.rating===2).length}</b></span><span><i className="again"/> Ошибки <b>{events.filter(e=>e.rating===1).length}</b></span></div></div></div>
    <div className="progress-grid lower"><div className="card"><div className="card-heading"><div><span className="eyebrow subtle">Требуют внимания</span><h3>Сложные слова</h3></div></div>{weak.length?weak.map(({card,p})=><div className="weak-row" key={card.id}><div><b>{card.word}</b><small>{card.translation}</small></div><span>{(p!.recognition.lapses+p!.production.lapses)} ошибок</span></div>):<div className="empty-mini">Сложные слова появятся после первых ошибок.</div>}</div><div className="card"><div className="card-heading"><div><span className="eyebrow subtle">По темам</span><h3>Фокус обучения</h3></div></div>{catStats.length?catStats.slice(0,6).map(s=><div className="category-row" key={s.category}><span>{s.category}</span><div><i style={{width:`${Math.min(100,s.count/Math.max(1,total)*300)}%`}}/></div><b>{s.count}</b></div>):<div className="empty-mini">Начните тренировку, чтобы увидеть статистику категорий.</div>}</div></div>
  </div>;
}

function SettingsPage({data,setData,cards,flash}:{data:AppData;setData:(d:AppData)=>void;cards:WordCard[];flash:(s:string)=>void}) {
  const fileRef=useRef<HTMLInputElement>(null); const s=data.settings; const update=(patch:Partial<Settings>)=>setData({...data,settings:{...s,...patch}});
  async function restore(file?:File){if(!file)return;try{const parsed=JSON.parse(await file.text());const restored=parsed.data||parsed;if(!restored.settings||!restored.progress)throw new Error();setData({...defaultData,...restored,settings:{...defaultData.settings,...restored.settings}});flash('Резервная копия восстановлена');}catch{flash('Не удалось прочитать резервную копию');}}
  return <div className="page settings-page"><div className="page-intro"><div><p>Персонализация</p><h2>Настройки обучения</h2><span>Подстройте нагрузку, произношение и внешний вид под себя.</span></div></div><div className="settings-grid"><section className="card settings-section"><div className="section-title"><div className="settings-icon lime"><Gauge size={20}/></div><div><h3>Учебная нагрузка</h3><p>Количество новых слов и повторений</p></div></div><SettingRow label="Новых слов в день" hint="Рекомендуем 10–15"><Stepper value={s.dailyNew} min={3} max={30} set={v=>update({dailyNew:v})}/></SettingRow><SettingRow label="Лимит повторений" hint="Просроченные карточки идут первыми"><Stepper value={s.dailyReviews} min={20} max={200} step={10} set={v=>update({dailyReviews:v})}/></SettingRow><SettingRow label="Целевая вероятность удержания" hint="Выше — чаще повторения"><div className="range-wrap"><input type="range" min="80" max="97" value={Math.round(s.retention*100)} onChange={e=>update({retention:Number(e.target.value)/100})}/><b>{Math.round(s.retention*100)}%</b></div></SettingRow><SettingRow label="Максимальный уровень" hint="Материал адаптируется к результатам"><select value={s.level} onChange={e=>update({level:e.target.value as Level})}><option>B1</option><option>B1+</option><option>B2</option></select></SettingRow></section>
    <section className="card settings-section"><div className="section-title"><div className="settings-icon violet"><Headphones size={20}/></div><div><h3>Язык и звук</h3><p>Голос и отображение объяснений</p></div></div><SettingRow label="Акцент произношения" hint="Системный голос устройства"><Segment value={s.accent} options={[['en-GB','British'],['en-US','American']]} set={v=>update({accent:v as Settings['accent']})}/></SettingRow><SettingRow label="Язык объяснений" hint="Постепенно уменьшайте зависимость от перевода"><select value={s.explanation} onChange={e=>update({explanation:e.target.value as Settings['explanation']})}><option value="ru">Русский</option><option value="en">English</option><option value="both">Оба языка</option></select></SettingRow><SettingRow label="Звук" hint="Произношение слов и примеров"><Toggle value={s.sound} set={v=>update({sound:v})}/></SettingRow><SettingRow label="Автовоспроизведение" hint="При открытии новой карточки"><Toggle value={s.autoPlay} set={v=>update({autoPlay:v})}/></SettingRow></section>
    <section className="card settings-section"><div className="section-title"><div className="settings-icon blue"><Sparkles size={20}/></div><div><h3>Интерфейс</h3><p>Тема и отображение приложения</p></div></div><SettingRow label="Тема" hint="Можно следовать настройкам системы"><Segment value={s.theme} options={[['light','Светлая'],['dark','Тёмная'],['system','Система']]} set={v=>update({theme:v as Settings['theme']})}/></SettingRow><SettingRow label="Язык интерфейса" hint="English UI подготовлен для следующего обновления"><select value={s.interfaceLanguage} onChange={e=>update({interfaceLanguage:e.target.value as Settings['interfaceLanguage']})}><option value="ru">Русский</option><option value="en">English (beta)</option></select></SettingRow><SettingRow label="Дневная цель" hint="Количество выполненных заданий"><Stepper value={data.dailyGoal} min={5} max={100} step={5} set={v=>setData({...data,dailyGoal:v})}/></SettingRow></section>
    <section className="card settings-section"><div className="section-title"><div className="settings-icon orange"><Database size={20}/></div><div><h3>Данные и резервная копия</h3><p>Ваши данные остаются на устройстве</p></div></div><div className="privacy-note"><ShieldCheck size={20}/><p><b>Локальное хранение</b>Прогресс сохраняется в IndexedDB. Приложение работает без регистрации и не отправляет учебные данные на сервер.</p></div><div className="backup-actions"><button className="secondary-btn" onClick={()=>exportBackup(data)}><Download size={17}/> Скачать backup</button><button className="secondary-btn" onClick={()=>fileRef.current?.click()}><Upload size={17}/> Восстановить</button><button className="secondary-btn" onClick={()=>exportCsv(cards)}><Download size={17}/> Экспорт CSV</button><input ref={fileRef} type="file" accept="application/json" hidden onChange={e=>restore(e.target.files?.[0])}/></div></section></div>
    <section className="danger-zone card"><div><h3>Сбросить учебный прогресс</h3><p>Карточки и настройки сохранятся, история повторений будет удалена.</p></div><button className="danger-btn" onClick={()=>{if(confirm('Удалить всю историю повторений?')){setData({...data,progress:{},history:[],activity:{},streak:0});flash('Учебный прогресс сброшен');}}}><Trash2 size={17}/> Сбросить</button></section>
  </div>;
}

function SettingRow({label,hint,children}:{label:string;hint:string;children:React.ReactNode}){return <div className="setting-row"><div><b>{label}</b><small>{hint}</small></div>{children}</div>}
function Stepper({value,set,min,max,step=1}:{value:number;set:(v:number)=>void;min:number;max:number;step?:number}){return <div className="stepper"><button onClick={()=>set(Math.max(min,value-step))}>−</button><b>{value}</b><button onClick={()=>set(Math.min(max,value+step))}>+</button></div>}
function Toggle({value,set}:{value:boolean;set:(v:boolean)=>void}){return <button aria-label="Переключить" className={`toggle ${value?'on':''}`} onClick={()=>set(!value)}><i/></button>}
function Segment({value,options,set}:{value:string;options:string[][];set:(v:string)=>void}){return <div className="segment">{options.map(([id,label])=><button key={id} className={value===id?'active':''} onClick={()=>set(id)}>{label}</button>)}</div>}

function Onboarding({data,onFinish}:{data:AppData;onFinish:(d:AppData)=>void}) {
  const [step,setStep]=useState(0); const [settings,setSettings]=useState(data.settings); const [selected,setSelected]=useState<Category[]>(data.settings.topics);
  const screens=[
    <div className="onboard-copy" key="welcome"><div className="onboard-art"><div className="word-float w1">figure out <span>B1</span></div><div className="word-float w2">nevertheless <span>B2</span></div><div className="word-float w3">make the most of <span>B2</span></div><div className="orbit"><Brain size={52}/></div></div><span className="eyebrow"><Sparkles size={15}/> Ваш путь к уверенному B2</span><h1>Не просто узнавайте слова.<br/><em>Начните ими говорить.</em></h1><p>LexiFlow сочетает интервальные повторения, живые контексты и активное воспроизведение — всё, что нужно для прочного словарного запаса.</p></div>,
    <div className="onboard-copy compact" key="level"><span className="eyebrow"><Gauge size={15}/> Настройка сложности</span><h1>С какого уровня начнём?</h1><p>Вы сможете изменить это позже. Мы будем постепенно подмешивать более сложную лексику по результатам ответов.</p><div className="level-options">{(['B1','B1+','B2'] as Level[]).map(l=><button key={l} className={settings.level===l?'active':''} onClick={()=>setSettings({...settings,level:l})}><b>{l}</b><span>{l==='B1'?'Уверенная база':l==='B1+'?'Мост к продвинутому':'Свободное общение'}</span><small>{l==='B1'?'Частотные слова и фразы':l==='B1+'?'Больше нюансов и контекста':'Аргументация и точность'}</small><Check size={18}/></button>)}</div></div>,
    <div className="onboard-copy compact" key="topics"><span className="eyebrow"><Target size={15}/> Персональная программа</span><h1>Что вам особенно интересно?</h1><p>Выберите несколько тем. Они получат приоритет в новых карточках.</p><div className="topic-options">{categories.map((c,i)=><button key={c} className={selected.includes(c)?'active':''} onClick={()=>setSelected(v=>v.includes(c)?v.filter(x=>x!==c):[...v,c])}><span>{['💬','💼','💻','💡','🧠','✈️','⚡','🔗','↔️'][i]}</span><b>{c}</b><Check size={17}/></button>)}</div></div>
  ];
  return <div className="onboarding"><header><div className="logo"><span className="brand-mark">L</span><span>LexiFlow</span></div><span>Шаг {step+1} из 3</span></header><main>{screens[step]}<div className="onboard-footer"><div className="dots">{[0,1,2].map(i=><i key={i} className={step===i?'active':''}/>)}</div><button className="primary-btn dark" onClick={()=>step<2?setStep(step+1):onFinish({...data,settings:{...settings,topics:selected.length?selected:settings.topics}})}>{step<2?'Продолжить':'Начать обучение'} <ArrowRight size={18}/></button>{step>0&&<button className="back-btn" onClick={()=>setStep(step-1)}>Назад</button>}</div></main></div>;
}

function recentDays(count:number){return Array.from({length:count},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(count-1-i));return{key:d.toISOString().slice(0,10),label:d.toLocaleDateString('ru-RU',{weekday:'short'}).slice(0,2),short:d.toLocaleDateString('ru-RU',{day:'numeric',month:'short'})}})}
function levenshtein(a:string,b:string){const m=Array.from({length:a.length+1},(_,i)=>[i]);for(let j=0;j<=b.length;j++)m[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)m[i][j]=Math.min(m[i-1][j]+1,m[i][j-1]+1,m[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return m[a.length][b.length]}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
