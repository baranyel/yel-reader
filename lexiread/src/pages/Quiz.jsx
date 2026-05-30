import { useState, useMemo, useCallback } from 'react';
import { Icon, Button, PageHeader } from '../components/ui.jsx';

function buildQuestions(words) {
  const pool = words.filter((w) => w.definition);
  if (pool.length < 4) return null;

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const count = Math.min(10, shuffled.length);
  const questions = shuffled.slice(0, count);

  return questions.map((q) => {
    const distractors = pool
      .filter((w) => w.word !== q.word)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const choices = [
      { text: q.definition, correct: true },
      ...distractors.map((d) => ({ text: d.definition, correct: false })),
    ].sort(() => Math.random() - 0.5);

    return { word: q.word, choices };
  });
}

export default function Quiz({ words, onBack, t }) {
  const [questions] = useState(() => buildQuestions(words));
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null); // index of chosen choice
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const [localQuestions, setLocalQuestions] = useState(questions);

  const q = localQuestions?.[idx];

  const handleAnswer = useCallback((i) => {
    if (selected !== null) return; // already answered
    setSelected(i);
    if (localQuestions[idx].choices[i].correct) setScore((s) => s + 1);
  }, [selected, idx, localQuestions]);

  const handleNext = () => {
    if (idx + 1 >= localQuestions.length) {
      setDone(true);
    } else {
      setIdx((i) => i + 1);
      setSelected(null);
    }
  };

  const handleRetry = () => {
    const fresh = buildQuestions(words);
    setLocalQuestions(fresh);
    setIdx(0);
    setSelected(null);
    setScore(0);
    setDone(false);
  };

  // Not enough words with definitions
  if (!localQuestions) {
    const needed = Math.max(0, 4 - words.filter((w) => w.definition).length);
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center', padding: '60px 24px', animation: 'fadeUp .4s ease' }}>
        <div style={{ width: 88, height: 88, borderRadius: 24, background: 'var(--accent-soft)', display: 'grid', placeItems: 'center', margin: '0 auto 24px', color: 'var(--accent)' }}>
          <Icon name="zap" size={40} stroke={1.5} />
        </div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{t('quiz.need_more', needed)}</h2>
        <p style={{ margin: '10px 0 28px', fontSize: 15, color: 'var(--text-faint)', lineHeight: 1.6 }}>{t('quiz.need_more_hint')}</p>
        <Button variant="primary" icon="arrowLeft" onClick={onBack}>{t('quiz.exit')}</Button>
      </div>
    );
  }

  // Finished
  if (done) {
    const total = localQuestions.length;
    const pct = Math.round((score / total) * 100);
    const great = pct >= 80;
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center', padding: '60px 24px', animation: 'fadeUp .4s ease' }}>
        <div style={{ width: 96, height: 96, borderRadius: 28, background: great ? 'var(--accent-soft)' : 'color-mix(in srgb,#B45309 15%,transparent)', display: 'grid', placeItems: 'center', margin: '0 auto 24px', color: great ? 'var(--accent)' : '#B45309' }}>
          <Icon name={great ? 'check' : 'book'} size={44} stroke={1.5} />
        </div>
        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: 'var(--text)' }}>{t('quiz.finish_title')}</h2>
        <div style={{ margin: '16px auto', width: 120, height: 120, position: 'relative' }}>
          <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="60" cy="60" r="50" fill="none" stroke="var(--border)" strokeWidth="10" />
            <circle cx="60" cy="60" r="50" fill="none" stroke={great ? 'var(--accent)' : '#B45309'}
              strokeWidth="10" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 50}
              strokeDashoffset={2 * Math.PI * 50 * (1 - score / total)} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
            <div>
              <div style={{ fontSize: 30, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{score}/{total}</div>
              <div style={{ fontSize: 13, color: 'var(--text-faint)', marginTop: 4 }}>{pct}%</div>
            </div>
          </div>
        </div>
        <p style={{ margin: '0 0 28px', fontSize: 15.5, color: 'var(--text-soft)' }}>{t('quiz.finish_score', score, total)}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button variant="secondary" icon="arrowLeft" onClick={onBack}>{t('quiz.exit')}</Button>
          <Button variant="primary" icon="zap" onClick={handleRetry}>{t('quiz.retry')}</Button>
        </div>
      </div>
    );
  }

  // Question
  const total = localQuestions.length;
  const progress = (idx / total) * 100;

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', animation: 'fadeUp .3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <Button variant="ghost" icon="arrowLeft" size="sm" onClick={onBack}>{t('quiz.exit')}</Button>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-faint)' }}>{t('quiz.progress', idx + 1, total)}</span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: 'var(--border)', borderRadius: 99, marginBottom: 32, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${((idx + (selected !== null ? 1 : 0)) / total) * 100}%`, background: 'var(--accent)', borderRadius: 99, transition: 'width .3s ease' }} />
      </div>

      {/* Word */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          {t('quiz.title')}
        </p>
        <h1 style={{ margin: 0, fontFamily: 'var(--reading-font)', fontSize: 42, fontWeight: 600, color: 'var(--text)', letterSpacing: '-.02em' }}>
          {q.word}
        </h1>
      </div>

      {/* Choices */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {q.choices.map((choice, i) => {
          let bg = 'var(--bg-elev)';
          let border = 'var(--border)';
          let color = 'var(--text)';
          if (selected !== null) {
            if (choice.correct) { bg = 'color-mix(in srgb, var(--accent) 12%, transparent)'; border = 'var(--accent)'; color = 'var(--accent)'; }
            else if (i === selected && !choice.correct) { bg = 'color-mix(in srgb,#c0392b 10%,transparent)'; border = '#c0392b'; color = '#c0392b'; }
          }
          return (
            <button key={i} onClick={() => handleAnswer(i)} disabled={selected !== null}
              style={{
                width: '100%', padding: '14px 18px', border: `1px solid ${border}`, borderRadius: 'var(--radius)',
                background: bg, color, fontSize: 14.5, lineHeight: 1.55, textAlign: 'left', cursor: selected !== null ? 'default' : 'pointer',
                boxShadow: selected === null ? 'var(--shadow-sm)' : 'none',
                transition: 'border-color .15s, background .15s, color .15s',
                display: 'flex', alignItems: 'center', gap: 14,
              }}
              onMouseEnter={(e) => { if (selected === null) { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; } }}
              onMouseLeave={(e) => { if (selected === null) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; } }}>
              <span style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 7, background: 'var(--bg-sunk)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700, color: 'var(--text-faint)' }}>
                {String.fromCharCode(65 + i)}
              </span>
              {choice.text}
            </button>
          );
        })}
      </div>

      {/* Next button */}
      {selected !== null && (
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', animation: 'fadeUp .2s ease' }}>
          <Button variant="primary" iconRight="chevronRight" onClick={handleNext}>
            {idx + 1 < total ? t('quiz.next') : t('quiz.finish_title')}
          </Button>
        </div>
      )}
    </div>
  );
}
