import { useMemo, useState } from 'react';
import { Icon, PageHeader } from '../components/ui.jsx';
import { CEFR_LEVELS, CEFR_COLORS, CEFR_LABELS, getCefrLevel, getCefrLevelSync } from '../utils/cefrWords.js';
import { save, WORDS_KEY } from '../utils/storage.js';

// ---- CEFR distribution bar --------------------------------------------------
function CefrBar({ level, count, total, color }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const [hover, setHover] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
      <div style={{ width: 54, fontSize: 12.5, fontWeight: 700, color, flexShrink: 0 }}>{level}</div>
      <div style={{ flex: 1, height: 22, background: 'var(--bg-sunk)', borderRadius: 99, overflow: 'hidden', position: 'relative' }}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
        <div style={{
          height: '100%', width: pct + '%', background: color, borderRadius: 99,
          transition: 'width .6s cubic-bezier(.4,0,.2,1)',
          minWidth: count > 0 ? 6 : 0,
        }} />
        {hover && count > 0 && (
          <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 700, color: 'var(--text-faint)' }}>
            {pct.toFixed(1)}%
          </div>
        )}
      </div>
      <div style={{ width: 36, fontSize: 13, fontWeight: 700, color: count > 0 ? 'var(--text)' : 'var(--text-faint)', textAlign: 'right', flexShrink: 0 }}>{count}</div>
    </div>
  );
}

// ---- Monthly stacked bar chart ----------------------------------------------
function MonthlyChart({ months }) {
  if (!months.length) return null;
  const maxTotal = Math.max(...months.map((m) => m.total), 1);
  const chartH = 140;

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, minWidth: Math.max(months.length * 38, 200), height: chartH + 28, paddingBottom: 28, position: 'relative' }}>
        {/* Y-axis gridlines */}
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <div key={f} style={{
            position: 'absolute', left: 0, right: 0,
            bottom: 28 + f * chartH,
            borderTop: '1px dashed var(--border)',
            pointerEvents: 'none',
          }} />
        ))}
        {months.map((m) => {
          const barH = (m.total / maxTotal) * chartH;
          return (
            <div key={m.label} style={{ flex: 1, minWidth: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
              {/* Stacked bar */}
              <div style={{ width: '100%', height: barH, display: 'flex', flexDirection: 'column-reverse', borderRadius: '4px 4px 0 0', overflow: 'hidden', transition: 'height .5s ease' }}>
                {CEFR_LEVELS.map((level) => {
                  const c = m.counts[level] || 0;
                  if (!c) return null;
                  const h = (c / m.total) * barH;
                  return (
                    <div key={level} title={`${level}: ${c}`} style={{ height: h, background: CEFR_COLORS[level], flexShrink: 0, transition: 'height .5s ease' }} />
                  );
                })}
              </div>
              {/* Month label */}
              <div style={{ marginTop: 5, fontSize: 10.5, color: 'var(--text-faint)', fontWeight: 600, whiteSpace: 'nowrap' }}>{m.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Reclassify button ------------------------------------------------------
function ReclassifyButton({ words, onDone, t }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const unclassified = words.filter((w) => !w.cefr).length;

  const run = async () => {
    setLoading(true);
    const updated = [...words];
    for (const w of updated) {
      if (!w.cefr) {
        w.cefr = await getCefrLevel(w.word).catch(() => null);
      }
    }
    save(WORDS_KEY, updated);
    onDone(updated);
    setLoading(false);
    setDone(true);
  };

  if (!unclassified) return null;
  return (
    <button onClick={run} disabled={loading}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-sunk)', color: loading ? 'var(--text-faint)' : 'var(--text)', cursor: loading ? 'wait' : 'pointer' }}>
      <Icon name={loading ? 'loader' : done ? 'check' : 'sparkle'} size={15} />
      {loading ? t('progress.classifying') : done ? t('progress.classify_done') : t('progress.classify', unclassified)}
    </button>
  );
}

// ---- Main page --------------------------------------------------------------
export default function Progress({ words: initialWords, t, onWordsUpdated }) {
  const [words, setWords] = useState(initialWords);

  // Sync-classify words not yet classified using bundled data only (instant)
  const enriched = useMemo(() => words.map((w) => ({
    ...w,
    cefr: w.cefr || getCefrLevelSync(w.word),
  })), [words]);

  // Distribution counts
  const counts = useMemo(() => {
    const c = Object.fromEntries(CEFR_LEVELS.map((l) => [l, 0]));
    let unknown = 0;
    for (const w of enriched) {
      if (w.cefr && c[w.cefr] !== undefined) c[w.cefr]++;
      else unknown++;
    }
    return { ...c, unknown };
  }, [enriched]);

  const total = enriched.length;
  const classified = total - counts.unknown;

  // Monthly breakdown (last 12 months)
  const months = useMemo(() => {
    const now = new Date();
    const result = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const label = d.toLocaleString('default', { month: 'short', year: i === 0 || d.getMonth() === 0 ? '2-digit' : undefined });
      const monthWords = enriched.filter((w) => w.savedAt >= d.getTime() && w.savedAt < next.getTime());
      if (monthWords.length === 0 && i > 6) continue; // skip empty old months
      const monthCounts = Object.fromEntries(CEFR_LEVELS.map((l) => [l, 0]));
      for (const w of monthWords) { if (w.cefr && monthCounts[w.cefr] !== undefined) monthCounts[w.cefr]++; }
      result.push({ label, counts: monthCounts, total: monthWords.length });
    }
    return result.filter((m) => m.total > 0);
  }, [enriched]);

  if (total === 0) {
    return (
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <PageHeader title={t('progress.title')} subtitle={t('progress.subtitle_empty')} />
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-faint)' }}>
          <Icon name="chart" size={40} stroke={1.3} style={{ marginBottom: 16 }} />
          <p style={{ fontSize: 15, margin: 0 }}>{t('progress.empty_body')}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', animation: 'fadeUp .35s ease' }}>
      <PageHeader title={t('progress.title')} subtitle={t('progress.subtitle', total)} />

      {/* CEFR distribution card */}
      <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '22px 24px', boxShadow: 'var(--shadow-sm)', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{t('progress.dist_title')}</h2>
            <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--text-faint)' }}>{t('progress.dist_hint', classified, total)}</p>
          </div>
          <ReclassifyButton words={words} t={t}
            onDone={(updated) => { setWords(updated); onWordsUpdated?.(updated); }} />
        </div>
        {CEFR_LEVELS.map((level) => (
          <CefrBar key={level} level={level} count={counts[level]} total={classified || 1} color={CEFR_COLORS[level]} />
        ))}
        {counts.unknown > 0 && (
          <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--text-faint)' }}>
            {t('progress.unclassified', counts.unknown)}
          </p>
        )}
      </div>

      {/* Level cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 10, marginBottom: 20 }}>
        {CEFR_LEVELS.filter((l) => counts[l] > 0).map((level) => (
          <div key={level} style={{ background: 'var(--bg-elev)', border: `2px solid ${CEFR_COLORS[level]}33`, borderRadius: 'var(--radius)', padding: '14px 12px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: CEFR_COLORS[level], letterSpacing: '-.01em' }}>{counts[level]}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: CEFR_COLORS[level], marginTop: 2 }}>{level}</div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{CEFR_LABELS[level].split(' · ')[1]}</div>
          </div>
        ))}
      </div>

      {/* Monthly chart */}
      {months.length > 1 && (
        <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '22px 24px', boxShadow: 'var(--shadow-sm)', marginBottom: 20 }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{t('progress.monthly_title')}</h2>
          <MonthlyChart months={months} />
          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 12 }}>
            {CEFR_LEVELS.map((l) => (
              <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-faint)', fontWeight: 500 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: CEFR_COLORS[l], display: 'inline-block' }} />
                {l}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
