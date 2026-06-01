import { useState, useMemo, useEffect, useRef } from 'react';
import { Icon, Button } from '../components/ui.jsx';
import { sm2Update } from '../utils/storage.js';

// ---- Constants ---------------------------------------------------------------
const STREAK_KEY = 'yelreader_streak';

const LANG_FLAGS = {
  en: '🇬🇧', tr: '🇹🇷', fr: '🇫🇷', de: '🇩🇪',
  es: '🇪🇸', it: '🇮🇹', pt: '🇵🇹', ru: '🇷🇺',
  ja: '🇯🇵', ko: '🇰🇷', zh: '🇨🇳',
};

const CEFR_COLORS = {
  A1: '#16a34a', A2: '#0d9488', B1: '#2563eb',
  B2: '#7c3aed', C1: '#ea580c', C2: '#dc2626',
};

// ---- Streak helpers ----------------------------------------------------------
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function loadStreakData() {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return { streak: 0, studyMap: {} };
    return JSON.parse(raw);
  } catch {
    return { streak: 0, studyMap: {} };
  }
}

function calcStreakFromMap(studyMap) {
  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 365; i++) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    if (!studyMap[key]) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function saveStreakData(studyMap) {
  const streak = calcStreakFromMap(studyMap);
  localStorage.setItem(STREAK_KEY, JSON.stringify({ streak, studyMap }));
  return streak;
}

// ---- Queue builder -----------------------------------------------------------
function buildQueue(words) {
  const now = Date.now();
  const due = words.filter(
    (w) => w.definition && (!w.sm2_nextReview || w.sm2_nextReview <= now)
  );
  return [...due].sort(() => Math.random() - 0.5).slice(0, 20);
}

// ---- Next review preview (pure, no side-effects) ----------------------------
function previewNextReview(word, quality) {
  if (quality === 0) return '~10 min';
  const { sm2_interval } = sm2Update(word, quality);
  return sm2_interval === 1 ? '1 day' : `${sm2_interval} days`;
}

// ---- Highlighted sentence ---------------------------------------------------
function HighlightedSentence({ sentence, word }) {
  if (!sentence || !word) return null;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = sentence.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === word.toLowerCase() ? (
          <mark
            key={i}
            style={{
              background: 'var(--accent-soft)',
              color: 'var(--accent)',
              borderRadius: 3,
              padding: '0 2px',
              fontStyle: 'normal',
              fontWeight: 600,
            }}
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

// ---- 30-day heatmap ---------------------------------------------------------
function HeatMap({ studyMap }) {
  const days = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push({ key, count: studyMap[key] || 0 });
  }
  const maxCount = Math.max(1, ...days.map((d) => d.count));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(30, 1fr)', gap: 3 }}>
      {days.map(({ key, count }) => {
        const intensity = count === 0 ? 0 : 0.25 + Math.min(1, count / maxCount) * 0.75;
        const bg = count === 0 ? 'var(--bg-sunk)' : `rgba(15,118,110,${intensity})`;
        return (
          <div
            key={key}
            title={`${key}: ${count}`}
            style={{
              aspectRatio: '1',
              borderRadius: 2,
              background: bg,
              border: '1px solid var(--border)',
            }}
          />
        );
      })}
    </div>
  );
}

// ---- Confetti ----------------------------------------------------------------
function Confetti() {
  const pieces = useMemo(() => {
    const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6'];
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      color: colors[i % colors.length],
      left: `${(i * 2.04) % 100}%`,
      delay: `${(i * 0.055) % 2.4}s`,
      duration: `${1.8 + (i * 0.09) % 1.6}s`,
      size: 6 + (i % 5) * 2,
      isCircle: i % 3 !== 0,
      reverse: i % 2 === 1,
    }));
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 9999 }}>
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            top: -24,
            left: p.left,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.isCircle ? '50%' : 2,
            animation: `${p.reverse ? 'confettiFallR' : 'confettiFall'} ${p.duration} ${p.delay} ease-in forwards`,
          }}
        />
      ))}
    </div>
  );
}

// ---- Grade button -----------------------------------------------------------
function GradeBtn({ emoji, label, nextLabel, shortcut, color, onClick }) {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '12px 6px 10px',
        borderRadius: 'var(--radius)',
        border: `1px solid ${color}35`,
        background: hover ? `${color}20` : `${color}0e`,
        cursor: 'pointer',
        transition: 'background .15s, transform .1s',
        transform: press ? 'translateY(1px)' : 'none',
        fontFamily: 'var(--font-ui)',
        minWidth: 0,
        minHeight: 88,
      }}
    >
      <span style={{ fontSize: 20, lineHeight: 1 }}>{emoji}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color, textAlign: 'center', lineHeight: 1.2, marginTop: 2 }}>
        {label}
      </span>
      <span style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{nextLabel}</span>
      <span style={{ fontSize: 10, color: 'var(--text-faint)', opacity: 0.5, marginTop: 1 }}>[{shortcut}]</span>
    </button>
  );
}

// ---- Main component ----------------------------------------------------------
export default function Review({ words, onBack, onUpdateWord, t }) {
  const [queue, setQueue] = useState(() => buildQueue(words));
  const [phase, setPhase] = useState('start'); // 'start' | 'review' | 'done'
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState({ again: 0, hard: 0, good: 0, easy: 0 });
  const [sessionStart, setSessionStart] = useState(null);
  const [streakData, setStreakData] = useState(() => loadStreakData());
  const [showConfetti, setShowConfetti] = useState(false);
  const [newStreak, setNewStreak] = useState(null);

  const flippedRef = useRef(flipped);
  useEffect(() => { flippedRef.current = flipped; });
  const gradeRef = useRef(null);

  const current = queue[idx];
  const total = queue.length;

  function finishSession(finalResults) {
    const today = todayKey();
    const count = finalResults.again + finalResults.hard + finalResults.good + finalResults.easy;
    const newMap = { ...streakData.studyMap, [today]: (streakData.studyMap[today] || 0) + count };
    const updatedStreak = saveStreakData(newMap);
    setStreakData({ streak: updatedStreak, studyMap: newMap });
    setNewStreak(updatedStreak);
    setPhase('done');
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 4500);
  }

  function handleGrade(quality) {
    const updates = sm2Update(current, quality);
    onUpdateWord(current.word, updates);
    const newResults = {
      again: results.again + (quality === 0 ? 1 : 0),
      hard: results.hard + (quality === 3 ? 1 : 0),
      good: results.good + (quality === 4 ? 1 : 0),
      easy: results.easy + (quality === 5 ? 1 : 0),
    };
    setResults(newResults);
    if (idx + 1 >= total) {
      finishSession(newResults);
    } else {
      setIdx((i) => i + 1);
      setFlipped(false);
    }
  }
  gradeRef.current = handleGrade;

  // Keyboard shortcuts — stable listener via refs
  useEffect(() => {
    if (phase !== 'review') return;
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === ' ') { e.preventDefault(); setFlipped(true); return; }
      if (!flippedRef.current) return;
      const map = { '1': 0, '2': 3, '3': 4, '4': 5 };
      if (e.key in map) gradeRef.current(map[e.key]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase]);

  function handleReviewAgain() {
    const newQueue = buildQueue(words);
    setQueue(newQueue);
    setIdx(0);
    setFlipped(false);
    setResults({ again: 0, hard: 0, good: 0, easy: 0 });
    setSessionStart(null);
    setShowConfetti(false);
    setNewStreak(null);
    setPhase('start');
  }

  // Upcoming schedule (next 1 day, next 3 days)
  const upcoming = useMemo(() => {
    const now = Date.now();
    const DAY = 86_400_000;
    return [
      { days: 1, count: words.filter((w) => w.sm2_nextReview > now && w.sm2_nextReview <= now + DAY).length },
      { days: 3, count: words.filter((w) => w.sm2_nextReview > now + DAY && w.sm2_nextReview <= now + 3 * DAY).length },
    ].filter((u) => u.count > 0);
  }, [words]);

  // ---- No words due --------------------------------------------------------
  if (phase === 'start' && total === 0) {
    return (
      <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center', padding: '60px 24px', animation: 'fadeUp .4s ease' }}>
        <div style={{ width: 88, height: 88, borderRadius: 24, background: 'var(--accent-soft)', display: 'grid', placeItems: 'center', margin: '0 auto 24px', color: 'var(--accent)' }}>
          <Icon name="check" size={42} stroke={1.5} />
        </div>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>{t('review.none_title')}</h2>
        <p style={{ margin: '10px 0 28px', fontSize: 15, color: 'var(--text-faint)', lineHeight: 1.65 }}>{t('review.none_body')}</p>

        <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px', marginBottom: 28, textAlign: 'left', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 24, display: 'inline-block', animation: 'flamePulse 2s ease-in-out infinite' }}>🔥</span>
            <div>
              <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{streakData.streak}</span>
              <span style={{ fontSize: 12.5, color: 'var(--text-faint)', marginLeft: 7 }}>{t('review.streak_label')}</span>
            </div>
          </div>
          <HeatMap studyMap={streakData.studyMap} />
        </div>

        <Button variant="primary" icon="arrowLeft" onClick={onBack}>{t('review.back')}</Button>
      </div>
    );
  }

  // ---- Start screen --------------------------------------------------------
  if (phase === 'start') {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 24px 60px', animation: 'fadeUp .35s ease' }}>
        <div style={{ marginBottom: 28 }}>
          <Button variant="ghost" icon="arrowLeft" size="sm" onClick={onBack}>{t('review.back')}</Button>
        </div>

        {/* Due count */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1 style={{ margin: '0 0 10px', fontSize: 26, fontWeight: 700, color: 'var(--text)' }}>
            {t('review.start_header')}
          </h1>
          <p style={{ margin: '0 0 2px', fontSize: 44, fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>{total}</p>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-faint)' }}>{t('review.start_due', total)}</p>
        </div>

        {/* Streak + heatmap */}
        <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 22px', marginBottom: 14, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 18 }}>
            <span style={{ fontSize: 28, display: 'inline-block', animation: streakData.streak > 0 ? 'flamePulse 2s ease-in-out infinite' : 'none' }}>🔥</span>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{streakData.streak}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-faint)', marginTop: 2 }}>{t('review.streak_label')}</div>
            </div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', color: 'var(--text-faint)', textTransform: 'uppercase', marginBottom: 8 }}>
            Last 30 days
          </div>
          <HeatMap studyMap={streakData.studyMap} />
        </div>

        {/* Upcoming schedule */}
        {upcoming.length > 0 && (
          <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px', marginBottom: 14, boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', color: 'var(--text-faint)', textTransform: 'uppercase', marginBottom: 12 }}>
              {t('review.upcoming_title')}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {upcoming.map((u) => (
                <div
                  key={u.days}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '5px 12px', borderRadius: 99,
                    background: 'var(--bg-sunk)', border: '1px solid var(--border)',
                    fontSize: 13,
                  }}
                >
                  <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{u.count}</span>
                  <span style={{ color: 'var(--text-soft)' }}>
                    {u.days === 1 ? t('review.upcoming_tomorrow') : t('review.upcoming_in_days', u.days)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div style={{ textAlign: 'center', paddingTop: 10 }}>
          <Button
            variant="primary"
            size="lg"
            icon="zap"
            onClick={() => { setSessionStart(Date.now()); setPhase('review'); }}
          >
            {t('review.start_btn')}
          </Button>
        </div>
      </div>
    );
  }

  // ---- Session done --------------------------------------------------------
  if (phase === 'done') {
    const reviewed = results.again + results.hard + results.good + results.easy;
    const correct = results.good + results.easy;
    const accuracy = reviewed > 0 ? Math.round((correct / reviewed) * 100) : 0;
    const elapsed = sessionStart ? Math.max(1, Math.round((Date.now() - sessionStart) / 60000)) : 1;

    return (
      <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center', padding: '60px 24px', animation: 'fadeUp .4s ease' }}>
        {showConfetti && <Confetti />}

        <div style={{ fontSize: 56, marginBottom: 14, animation: 'popIn .5s cubic-bezier(.2,.9,.3,1) both' }}>🎉</div>
        <h2 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 700, color: 'var(--text)' }}>{t('review.done_title')}</h2>
        <p style={{ margin: '0 0 28px', fontSize: 15, color: 'var(--text-soft)' }}>{t('review.done_body', reviewed)}</p>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
          {[
            { label: t('review.accuracy'), value: `${accuracy}%`, color: 'var(--accent)' },
            { label: t('review.time_spent'), value: `${elapsed}m`, color: '#3b82f6' },
          ].map((s) => (
            <div key={s.label} style={{ padding: '14px 24px', background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', minWidth: 90 }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Breakdown */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { label: t('review.easy'), count: results.easy, color: '#3b82f6' },
            { label: t('review.good'), count: results.good, color: '#22c55e' },
            { label: t('review.hard'), count: results.hard, color: '#f59e0b' },
            { label: t('review.again'), count: results.again, color: '#ef4444' },
          ]
            .filter((r) => r.count > 0)
            .map((r) => (
              <div key={r.label} style={{ textAlign: 'center', padding: '10px 16px', background: 'var(--bg-elev)', border: `1px solid ${r.color}30`, borderRadius: 'var(--radius)', minWidth: 64 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: r.color }}>{r.count}</div>
                <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>{r.label}</div>
              </div>
            ))}
        </div>

        {/* Streak badge */}
        {newStreak != null && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', borderRadius: 99,
            background: 'var(--accent-soft)', marginBottom: 28,
            animation: 'streakCountIn .5s .45s cubic-bezier(.2,.9,.3,1) both',
          }}>
            <span style={{ fontSize: 20 }}>🔥</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)' }}>
              {t('review.done_streak', newStreak)}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button variant="ghost" icon="arrowLeft" onClick={onBack}>{t('review.back')}</Button>
          <Button variant="primary" icon="repeat" onClick={handleReviewAgain}>{t('review.review_again')}</Button>
        </div>
      </div>
    );
  }

  // ---- Active review card --------------------------------------------------
  const remaining = total - idx;
  const estMin = Math.max(1, Math.round(remaining * 15 / 60));
  const progress = (idx / total) * 100;
  const flag = LANG_FLAGS[current?.lang] || '📖';

  const GRADE_BTNS = [
    { emoji: '❌', quality: 0, color: '#ef4444', shortcut: '1', labelKey: 'review.again' },
    { emoji: '😐', quality: 3, color: '#f59e0b', shortcut: '2', labelKey: 'review.hard' },
    { emoji: '✅', quality: 4, color: '#22c55e', shortcut: '3', labelKey: 'review.good' },
    { emoji: '🚀', quality: 5, color: '#3b82f6', shortcut: '4', labelKey: 'review.easy' },
  ];

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 0 48px', animation: 'fadeUp .25s ease' }}>
      {/* Progress bar */}
      <div style={{ height: 3, background: 'var(--border)', borderRadius: 99, overflow: 'hidden', marginBottom: 22 }}>
        <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', borderRadius: 99, transition: 'width .4s ease' }} />
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <Button variant="ghost" icon="arrowLeft" size="sm" onClick={onBack}>{t('review.back')}</Button>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>~{estMin} min</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-soft)', background: 'var(--bg-sunk)', padding: '3px 11px', borderRadius: 99, border: '1px solid var(--border)' }}>
            {t('review.progress', idx + 1, total)}
          </span>
        </div>
      </div>

      {/* 3D flip card */}
      <div
        style={{ perspective: '1200px', marginBottom: 18, cursor: flipped ? 'default' : 'pointer' }}
        onClick={!flipped ? () => setFlipped(true) : undefined}
      >
        <div
          style={{
            position: 'relative',
            minHeight: 360,
            transformStyle: 'preserve-3d',
            transition: 'transform .55s cubic-bezier(.4,0,.2,1)',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* FRONT */}
          <div
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              background: 'var(--bg-elev)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-md)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 32px 28px',
              textAlign: 'center',
              minHeight: 360,
            }}
          >
            {/* Language flag */}
            <span style={{ fontSize: 22, marginBottom: 14, lineHeight: 1 }}>{flag}</span>

            {/* Word */}
            <h1 style={{ margin: '0 0 10px', fontFamily: 'var(--reading-font)', fontSize: 48, fontWeight: 600, letterSpacing: '-.02em', color: 'var(--text)', lineHeight: 1.1 }}>
              {current.word}
            </h1>

            {/* POS */}
            {current.pos && current.pos !== '—' && (
              <span style={{ display: 'inline-block', fontSize: 12.5, fontWeight: 600, fontStyle: 'italic', color: 'var(--text-faint)', background: 'var(--bg-sunk)', border: '1px solid var(--border)', padding: '2px 10px', borderRadius: 99, marginBottom: 18 }}>
                {current.pos}
              </span>
            )}

            {/* Example sentence with word highlighted */}
            {current.example && (
              <p style={{ margin: '0 0 0', fontFamily: 'var(--reading-font)', fontStyle: 'italic', fontSize: 14.5, lineHeight: 1.7, color: 'var(--text-soft)', maxWidth: 380 }}>
                "<HighlightedSentence sentence={current.example} word={current.word} />"
              </p>
            )}

            {/* Flip hint */}
            <div style={{ position: 'absolute', bottom: 18, fontSize: 12, color: 'var(--text-faint)', opacity: 0.75, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 14 }}>↻</span>
              <span>{t('review.flip_hint')}</span>
            </div>
          </div>

          {/* BACK */}
          <div
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              background: 'var(--bg-elev)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-md)',
              padding: '28px 30px',
              overflowY: 'auto',
              minHeight: 360,
            }}
          >
            {/* CEFR badge */}
            {current.cefr && (
              <div style={{ marginBottom: 14 }}>
                <span style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: 99,
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#fff',
                  background: CEFR_COLORS[current.cefr] || 'var(--accent)',
                }}>
                  {current.cefr}
                </span>
              </div>
            )}

            {/* Definition */}
            <p style={{ margin: '0 0 16px', fontSize: 17, lineHeight: 1.65, color: 'var(--text)' }}>
              {current.definition}
            </p>

            {/* Example with highlight */}
            {current.example && (
              <p style={{ margin: '0 0 16px', fontFamily: 'var(--reading-font)', fontStyle: 'italic', fontSize: 14.5, lineHeight: 1.65, color: 'var(--text-soft)', borderLeft: '2px solid var(--border)', paddingLeft: 14 }}>
                "<HighlightedSentence sentence={current.example} word={current.word} />"
              </p>
            )}

            {/* Note */}
            {current.note && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', background: 'var(--bg-sunk)', borderRadius: 'var(--radius-sm)' }}>
                <Icon name="pen" size={14} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
                <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-soft)', lineHeight: 1.55 }}>{current.note}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reveal button / Rating buttons */}
      {!flipped ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <Button variant="primary" size="lg" onClick={() => setFlipped(true)}>
            {t('review.reveal')}
          </Button>
          <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{t('review.flip_hint')}</span>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, animation: 'fadeUp .18s ease' }}>
          {GRADE_BTNS.map((btn) => (
            <GradeBtn
              key={btn.quality}
              emoji={btn.emoji}
              label={t(btn.labelKey)}
              nextLabel={previewNextReview(current, btn.quality)}
              shortcut={btn.shortcut}
              color={btn.color}
              onClick={() => handleGrade(btn.quality)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
