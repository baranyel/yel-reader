import { useState, useMemo, useCallback } from 'react';
import { Icon, Button } from '../components/ui.jsx';
import { sm2Update } from '../utils/storage.js';

function buildQueue(words) {
  const now = Date.now();
  const due = words.filter(
    (w) => w.definition && (!w.sm2_nextReview || w.sm2_nextReview <= now)
  );
  return [...due].sort(() => Math.random() - 0.5).slice(0, 20);
}

export default function Review({ words, onBack, onUpdateWord, t }) {
  // Build queue once on mount — don't recompute from live words during session
  const [queue] = useState(() => buildQueue(words));
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const [results, setResults] = useState({ good: 0, hard: 0, forgot: 0 });

  const current = queue[idx];
  const total = queue.length;

  const handleGrade = useCallback((quality) => {
    const updates = sm2Update(current, quality);
    onUpdateWord(current.word, updates);

    setResults((r) => ({
      good: r.good + (quality === 5 ? 1 : 0),
      hard: r.hard + (quality === 3 ? 1 : 0),
      forgot: r.forgot + (quality === 0 ? 1 : 0),
    }));

    if (idx + 1 >= total) {
      setDone(true);
    } else {
      setIdx((i) => i + 1);
      setRevealed(false);
    }
  }, [current, idx, total, onUpdateWord]);

  // ---- No words due ---------------------------------------------------
  if (total === 0) {
    return (
      <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center', padding: '60px 24px', animation: 'fadeUp .4s ease' }}>
        <div style={{ width: 88, height: 88, borderRadius: 24, background: 'var(--accent-soft)', display: 'grid', placeItems: 'center', margin: '0 auto 24px', color: 'var(--accent)' }}>
          <Icon name="check" size={42} stroke={1.5} />
        </div>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>{t('review.none_title')}</h2>
        <p style={{ margin: '10px 0 28px', fontSize: 15, color: 'var(--text-faint)', lineHeight: 1.65 }}>{t('review.none_body')}</p>
        <Button variant="primary" icon="arrowLeft" onClick={onBack}>{t('review.back')}</Button>
      </div>
    );
  }

  // ---- Session done ---------------------------------------------------
  if (done) {
    const reviewed = results.good + results.hard + results.forgot;
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center', padding: '60px 24px', animation: 'fadeUp .4s ease' }}>
        <div style={{ width: 88, height: 88, borderRadius: 24, background: 'var(--accent-soft)', display: 'grid', placeItems: 'center', margin: '0 auto 24px', color: 'var(--accent)' }}>
          <Icon name="repeat" size={40} stroke={1.6} />
        </div>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>{t('review.done_title')}</h2>
        <p style={{ margin: '10px 0 24px', fontSize: 15, color: 'var(--text-soft)' }}>{t('review.done_body', reviewed)}</p>

        {/* Score breakdown */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 32, flexWrap: 'wrap' }}>
          {[
            { label: t('review.knew'), count: results.good, color: '#22c55e' },
            { label: t('review.hard'), count: results.hard, color: '#f59e0b' },
            { label: t('review.forgot'), count: results.forgot, color: '#ef4444' },
          ].map((r) => r.count > 0 && (
            <div key={r.label} style={{ textAlign: 'center', padding: '12px 18px', background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', minWidth: 80 }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: r.color }}>{r.count}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-faint)', marginTop: 2 }}>{r.label}</div>
            </div>
          ))}
        </div>

        <Button variant="primary" icon="arrowLeft" onClick={onBack}>{t('review.back')}</Button>
      </div>
    );
  }

  // ---- Active card ---------------------------------------------------
  const progress = ((idx + (revealed ? 1 : 0)) / total) * 100;
  const nextDays = current.sm2_interval ?? 1;

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', animation: 'fadeUp .25s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <Button variant="ghost" icon="arrowLeft" size="sm" onClick={onBack}>{t('review.back')}</Button>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-faint)' }}>
          {t('review.progress', idx + 1, total)}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: 'var(--border)', borderRadius: 99, marginBottom: 40, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', borderRadius: 99, transition: 'width .3s ease' }} />
      </div>

      {/* Card */}
      <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '40px 32px', textAlign: 'center', boxShadow: 'var(--shadow-md)', marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 6px', fontFamily: 'var(--reading-font)', fontSize: 46, fontWeight: 600, letterSpacing: '-.02em', color: 'var(--text)' }}>
          {current.word}
        </h1>
        {current.pos && current.pos !== '—' && (
          <span style={{ fontSize: 12.5, fontWeight: 600, fontStyle: 'italic', color: 'var(--text-faint)', background: 'var(--bg-sunk)', border: '1px solid var(--border)', padding: '2px 10px', borderRadius: 99 }}>
            {current.pos}
          </span>
        )}

        {revealed && (
          <div style={{ marginTop: 28, animation: 'fadeUp .2s ease' }}>
            <div style={{ height: 1, background: 'var(--border)', margin: '0 0 20px' }} />
            <p style={{ margin: 0, fontSize: 17, lineHeight: 1.65, color: 'var(--text)' }}>
              {current.definition}
            </p>
            {current.example && (
              <p style={{ margin: '16px 0 0', fontFamily: 'var(--reading-font)', fontStyle: 'italic', fontSize: 15.5, lineHeight: 1.65, color: 'var(--text-soft)' }}>
                "{current.example}"
              </p>
            )}
            {current.note && (
              <div style={{ marginTop: 18, display: 'flex', alignItems: 'flex-start', gap: 7, padding: '10px 14px', background: 'var(--bg-sunk)', borderRadius: 'var(--radius-sm)', textAlign: 'left' }}>
                <Icon name="pen" size={14} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
                <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-soft)', lineHeight: 1.55 }}>{current.note}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Buttons */}
      {!revealed ? (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Button variant="primary" size="lg" onClick={() => setRevealed(true)}>
            {t('review.reveal')}
          </Button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => handleGrade(0)} style={gradeStyle('#ef4444')}>
            <Icon name="x" size={18} />
            {t('review.forgot')}
          </button>
          <button onClick={() => handleGrade(3)} style={gradeStyle('#f59e0b')}>
            <Icon name="clock" size={18} />
            {t('review.hard')}
          </button>
          <button onClick={() => handleGrade(5)} style={gradeStyle('#22c55e')}>
            <Icon name="check" size={18} />
            {t('review.knew')}
          </button>
        </div>
      )}

      {/* Next review hint */}
      {revealed && (
        <p style={{ textAlign: 'center', marginTop: 18, fontSize: 12.5, color: 'var(--text-faint)' }}>
          {t('review.next_due')} {t('review.days', nextDays)}
        </p>
      )}
    </div>
  );
}

function gradeStyle(color) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    padding: '11px 22px', fontSize: 14.5, fontWeight: 600,
    border: `1px solid ${color}30`, borderRadius: 'var(--radius)',
    background: `${color}18`, color,
    cursor: 'pointer', transition: 'background .15s, transform .1s',
    fontFamily: 'var(--font-ui)',
  };
}
