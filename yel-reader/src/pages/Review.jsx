import { useState, useEffect, useRef } from 'react';
import { Icon, Button } from '../components/ui.jsx';
import { sm2Update } from '../utils/storage.js';
import { CEFR_COLORS } from '../utils/cefrWords.js';
import { lookupWord } from '../utils/dictionary.js';
import { buildQueue, dueWithin, afterGrade } from '../utils/reviewQueue.js';

const GRADES = [
  { quality: 0, key: '1', labelKey: 'review.again', color: '#ef4444' },
  { quality: 3, key: '2', labelKey: 'review.hard', color: '#f59e0b' },
  { quality: 4, key: '3', labelKey: 'review.good', color: '#22c55e' },
  { quality: 5, key: '4', labelKey: 'review.easy', color: '#3b82f6' },
];

// The sentence with the reviewed word emphasised.
function HighlightedSentence({ sentence, word }) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = sentence.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === word.toLowerCase()
      ? <mark key={i} style={{ background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: 3, padding: '0 2px', fontStyle: 'normal', fontWeight: 600 }}>{part}</mark>
      : part
  );
}

// Fetches a definition for words that were saved without one (offline, or lookup failed)
// and stores it on the word, so it only has to happen once.
function useMissingDefinition(word, enabled, definitionOptions, onUpdateWord) {
  const [state, setState] = useState('idle'); // idle | loading | failed | offline
  useEffect(() => {
    setState('idle');
    if (!enabled || !word) return;
    let cancelled = false;
    setState('loading');
    lookupWord(word.word, word.context || '', definitionOptions || {})
      .then((r) => {
        // Keep a found definition even if the reader already moved to the next card.
        if (r?.found) onUpdateWord(word.word, { definition: r.definition, pos: r.pos, example: r.example, lemma: r.lemma || null });
        if (!cancelled) setState(r?.found ? 'idle' : r?.offline ? 'offline' : 'failed');
      })
      .catch(() => { if (!cancelled) setState('failed'); });
    return () => { cancelled = true; };
  }, [word?.word, enabled]); // eslint-disable-line
  return state;
}

export default function Review({ words, onBack, onUpdateWord, definitionOptions, t }) {
  // The session's queue is fixed when the page opens; word data is always read live.
  const [queue, setQueue] = useState(() => buildQueue(words));
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [counts, setCounts] = useState({ 0: 0, 3: 0, 4: 0, 5: 0 });
  const relearn = useRef({});

  const current = idx < queue.length ? words.find((w) => w.word === queue[idx]) : null;
  const done = queue.length > 0 && idx >= queue.length;
  const defState = useMissingDefinition(current, flipped && !!current && !current.definition, definitionOptions, onUpdateWord);

  const grade = (quality) => {
    if (!current) return;
    onUpdateWord(current.word, sm2Update(current, quality));
    setCounts((c) => ({ ...c, [quality]: c[quality] + 1 }));
    setQueue((q) => afterGrade(q, current.word, quality, relearn.current));
    setIdx((i) => i + 1);
    setFlipped(false);
  };

  // A word deleted meanwhile simply drops out of the session.
  useEffect(() => {
    if (!done && idx < queue.length && !current) setIdx((i) => i + 1);
  }, [current, done, idx, queue.length]);

  // Space reveals, 1–4 grade.
  const gradeRef = useRef(grade);
  gradeRef.current = grade;
  useEffect(() => {
    if (done) return;
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea')) return;
      if (e.key === ' ') { e.preventDefault(); setFlipped(true); return; }
      const g = GRADES.find((x) => x.key === e.key);
      if (g && flipped) gradeRef.current(g.quality);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [done, flipped]);

  const nextLabel = (quality) => {
    if (quality === 0) return t('review.again_hint');
    return t('review.days', sm2Update(current, quality).sm2_interval);
  };

  // ---- Nothing due ----------------------------------------------------------
  if (queue.length === 0) {
    const soon = dueWithin(words, 7);
    return (
      <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center', padding: '60px 24px', animation: 'fadeUp .4s ease' }}>
        <div style={{ width: 80, height: 80, borderRadius: 22, background: 'var(--accent-soft)', display: 'grid', placeItems: 'center', margin: '0 auto 22px', color: 'var(--accent)' }}>
          <Icon name="check" size={38} stroke={1.5} />
        </div>
        <h2 style={{ margin: 0, fontSize: 23, fontWeight: 700, color: 'var(--text)' }}>{t('review.none_title')}</h2>
        <p style={{ margin: '10px 0 6px', fontSize: 15, color: 'var(--text-faint)', lineHeight: 1.6 }}>{t('review.none_body')}</p>
        {soon > 0 && <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-soft)' }}>{t('review.upcoming_week', soon)}</p>}
        <div style={{ marginTop: 26 }}>
          <Button variant="primary" icon="arrowLeft" onClick={onBack}>{t('review.back')}</Button>
        </div>
      </div>
    );
  }

  // ---- Session finished -----------------------------------------------------
  if (done) {
    const reviewed = counts[0] + counts[3] + counts[4] + counts[5];
    const moreDue = buildQueue(words).length;
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center', padding: '60px 24px', animation: 'fadeUp .4s ease' }}>
        <div style={{ width: 80, height: 80, borderRadius: 22, background: 'var(--accent-soft)', display: 'grid', placeItems: 'center', margin: '0 auto 22px', color: 'var(--accent)' }}>
          <Icon name="check" size={38} stroke={1.5} />
        </div>
        <h2 style={{ margin: '0 0 8px', fontSize: 23, fontWeight: 700, color: 'var(--text)' }}>{t('review.done_title')}</h2>
        <p style={{ margin: '0 0 14px', fontSize: 15, color: 'var(--text-soft)' }}>{t('review.done_body', reviewed)}</p>
        <p style={{ margin: '0 0 28px', fontSize: 13, color: 'var(--text-faint)' }}>
          {GRADES.filter((g) => counts[g.quality] > 0).map((g) => `${t(g.labelKey)} ${counts[g.quality]}`).join(' · ')}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button variant="secondary" icon="arrowLeft" onClick={onBack}>{t('review.back')}</Button>
          {moreDue > 0 && (
            <Button variant="primary" icon="repeat" onClick={() => {
              setQueue(buildQueue(words)); setIdx(0); setFlipped(false);
              setCounts({ 0: 0, 3: 0, 4: 0, 5: 0 }); relearn.current = {};
            }}>
              {t('review.continue', moreDue)}
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!current) return null;

  // ---- Card -----------------------------------------------------------------
  const sentence = current.context || current.example;
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 0 48px', animation: 'fadeUp .25s ease' }}>
      <div style={{ height: 3, background: 'var(--border)', borderRadius: 99, overflow: 'hidden', marginBottom: 22 }}>
        <div style={{ height: '100%', width: `${(idx / queue.length) * 100}%`, background: 'var(--accent)', borderRadius: 99, transition: 'width .3s ease' }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <Button variant="ghost" icon="arrowLeft" size="sm" onClick={onBack}>{t('review.back')}</Button>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-soft)', background: 'var(--bg-sunk)', padding: '3px 11px', borderRadius: 99, border: '1px solid var(--border)' }}>
          {t('review.progress', Math.min(idx + 1, queue.length), queue.length)}
        </span>
      </div>

      <div onClick={() => setFlipped(true)} style={{
        background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-md)', padding: '36px 32px', textAlign: 'center', marginBottom: 18,
        cursor: flipped ? 'default' : 'pointer', minHeight: 220,
      }}>
        <h1 style={{ margin: '0 0 12px', fontFamily: 'var(--reading-font)', fontSize: 44, fontWeight: 600, letterSpacing: '-.02em', color: 'var(--text)', lineHeight: 1.1 }}>
          {current.word}
        </h1>
        {sentence && (
          <p style={{ margin: '0 auto', maxWidth: 440, fontFamily: 'var(--reading-font)', fontStyle: 'italic', fontSize: 15, lineHeight: 1.7, color: 'var(--text-soft)' }}>
            “<HighlightedSentence sentence={sentence} word={current.word} />”
          </p>
        )}

        {flipped && (
          <div style={{ marginTop: 22, paddingTop: 20, borderTop: '1px solid var(--border)', textAlign: 'left', animation: 'fadeUp .18s ease' }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              {current.cefr && (
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#fff', background: CEFR_COLORS[current.cefr] || 'var(--accent)', padding: '2px 9px', borderRadius: 99 }}>{current.cefr}</span>
              )}
              {current.pos && current.pos !== '—' && (
                <span style={{ fontSize: 11.5, fontWeight: 600, fontStyle: 'italic', color: 'var(--text-faint)', background: 'var(--bg-sunk)', border: '1px solid var(--border)', padding: '1px 9px', borderRadius: 99 }}>{current.pos}</span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: 17, lineHeight: 1.6, color: current.definition ? 'var(--text)' : 'var(--text-faint)' }}>
              {current.definition
                || (defState === 'loading' ? t('review.def_loading')
                  : defState === 'offline' ? t('popup.offline')
                  : t('review.def_missing'))}
            </p>
            {current.example && current.example !== current.context && (
              <p style={{ margin: '12px 0 0', fontFamily: 'var(--reading-font)', fontStyle: 'italic', fontSize: 14.5, lineHeight: 1.6, color: 'var(--text-soft)' }}>
                “{current.example}”
              </p>
            )}
            {current.note && (
              <div style={{ display: 'flex', gap: 8, marginTop: 14, padding: '10px 14px', background: 'var(--bg-sunk)', borderRadius: 'var(--radius-sm)' }}>
                <Icon name="pen" size={14} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
                <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-soft)', lineHeight: 1.55 }}>{current.note}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {!flipped ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <Button variant="primary" size="lg" onClick={() => setFlipped(true)}>{t('review.reveal')}</Button>
          <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{t('review.flip_hint')}</span>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {GRADES.map((g) => (
            <button key={g.quality} onClick={() => grade(g.quality)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '11px 4px',
              borderRadius: 'var(--radius)', border: `1px solid ${g.color}40`, background: `${g.color}12`,
            }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: g.color }}>{t(g.labelKey)}</span>
              <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{nextLabel(g.quality)}</span>
              <span style={{ fontSize: 10, color: 'var(--text-faint)', opacity: .6 }}>[{g.key}]</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
