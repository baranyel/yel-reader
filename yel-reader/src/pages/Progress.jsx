import { useMemo, useState, useEffect, useRef } from 'react';
import { Icon, PageHeader } from '../components/ui.jsx';
import { CEFR_LEVELS, CEFR_COLORS, CEFR_LABELS, getCefrLevel, getCefrLevelSync } from '../utils/cefrWords.js';
import { save, load, WORDS_KEY, wordCount as countWords } from '../utils/storage.js';

// ---- Constants ---------------------------------------------------------------
const STREAK_KEY = 'yelreader_streak';

const CEFR_THRESHOLDS = [
  { level: 'A1', min: 0,    max: 500  },
  { level: 'A2', min: 500,  max: 1000 },
  { level: 'B1', min: 1000, max: 2000 },
  { level: 'B2', min: 2000, max: 4000 },
  { level: 'C1', min: 4000, max: 8000 },
  { level: 'C2', min: 8000, max: Infinity },
];

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ---- Helpers -----------------------------------------------------------------
function dateKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function mondayOf(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - ((dow + 6) % 7));
  return d;
}

function weekLabel(date) {
  const m = MONTH_ABBR[date.getMonth()];
  const wk = Math.ceil(date.getDate() / 7);
  return `${m} W${wk}`;
}

function computeLongestStreak(activityMap) {
  const days = Object.keys(activityMap).sort();
  if (!days.length) return 0;
  let best = 1, cur = 1;
  for (let i = 1; i < days.length; i++) {
    const diff = (new Date(days[i]) - new Date(days[i - 1])) / 86400000;
    cur = diff === 1 ? cur + 1 : 1;
    best = Math.max(best, cur);
  }
  return best;
}

// ---- Count-up hook -----------------------------------------------------------
function useCountUp(target, duration = 900, delay = 0) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    let raf, timer;
    let startTime = null;
    const run = (ts) => {
      if (!startTime) startTime = ts;
      const t = Math.min((ts - startTime) / duration, 1);
      setValue(Math.round((1 - Math.pow(1 - t, 3)) * target));
      if (t < 1) raf = requestAnimationFrame(run);
    };
    timer = setTimeout(() => { raf = requestAnimationFrame(run); }, delay);
    return () => { clearTimeout(timer); cancelAnimationFrame(raf); };
  }, [target, duration, delay]);
  return value;
}

// ---- Hero stat card ----------------------------------------------------------
function HeroCard({ emoji, value, label, color, delay }) {
  const animated = useCountUp(value, 900, delay);
  return (
    <div style={{
      background: 'var(--bg-elev)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '20px 18px',
      boxShadow: 'var(--shadow-sm)', textAlign: 'center',
    }}>
      <div style={{ fontSize: 26, marginBottom: 8, lineHeight: 1 }}>{emoji}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color, letterSpacing: '-.03em', lineHeight: 1, marginBottom: 6 }}>
        {animated.toLocaleString()}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-faint)', fontWeight: 500, lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

// ---- CEFR vocabulary journey bar ---------------------------------------------
function CefrJourney({ wordCount, t }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const tm = setTimeout(() => setAnimated(true), 150); return () => clearTimeout(tm); }, []);

  const curIdx = CEFR_THRESHOLDS.findLastIndex(th => wordCount >= th.min);
  const cur = CEFR_THRESHOLDS[curIdx] || CEFR_THRESHOLDS[0];
  const next = CEFR_THRESHOLDS[curIdx + 1];
  const totalProgress = cur.max === Infinity ? 100 : Math.min(100, (wordCount / 8000) * 100);

  return (
    <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 22px', boxShadow: 'var(--shadow-sm)' }}>
      <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
        {t('progress.vocab_level_title')}
      </h3>

      {/* Level labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        {CEFR_THRESHOLDS.map((th) => (
          <div key={th.level} style={{ flex: 1, textAlign: 'center' }}>
            <span style={{
              display: 'inline-block', fontSize: 11, fontWeight: 700,
              color: th.level === cur.level ? CEFR_COLORS[th.level] : 'var(--text-faint)',
              padding: '1px 4px', borderRadius: 4,
              background: th.level === cur.level ? `${CEFR_COLORS[th.level]}18` : 'transparent',
              outline: th.level === cur.level ? `1px solid ${CEFR_COLORS[th.level]}40` : 'none',
            }}>{th.level}</span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ height: 10, background: 'var(--bg-sunk)', borderRadius: 99, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{
          height: '100%',
          width: animated ? `${totalProgress}%` : '0%',
          borderRadius: 99,
          background: `linear-gradient(90deg, ${CEFR_COLORS.A1} 0%, ${CEFR_COLORS.A2} 20%, ${CEFR_COLORS.B1} 40%, ${CEFR_COLORS.B2} 60%, ${CEFR_COLORS.C1} 80%, ${CEFR_COLORS.C2} 100%)`,
          transition: 'width 1.3s cubic-bezier(.4,0,.2,1)',
        }} />
      </div>

      {/* Current level indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8, flexShrink: 0,
          background: CEFR_COLORS[cur.level], color: '#fff',
          display: 'grid', placeItems: 'center',
          fontSize: 12, fontWeight: 800,
          boxShadow: `0 2px 8px ${CEFR_COLORS[cur.level]}50`,
        }}>
          {cur.level}
        </div>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>
            {CEFR_LABELS[cur.level]?.split(' · ')[1] ?? cur.level}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 3 }}>
            {next
              ? t('progress.vocab_level_to_next', (next.min - wordCount).toLocaleString(), next.level)
              : t('progress.vocab_level_at_max')}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: 'var(--text-faint)' }}>
          {wordCount.toLocaleString()} / {cur.max === Infinity ? '8k+' : cur.max.toLocaleString()}
        </div>
      </div>
    </div>
  );
}

// ---- Activity heatmap (365 days) ---------------------------------------------
function ActivityHeatmap({ activityMap, t }) {
  const CELL = 12, GAP = 2, UNIT = 14;
  const LABEL_H = 18, DAY_LABEL_W = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build cells starting from the Monday 52 full weeks back
  const startMonday = mondayOf(new Date(today.getTime() - 52 * 7 * 86400000));

  const cells = [];
  const colMonths = {}; // col → month label when month changes
  let col = 0, prevMonth = -1;
  const cursor = new Date(startMonday);

  while (cursor <= today) {
    const dow = (cursor.getDay() + 6) % 7; // Mon=0 … Sun=6
    if (dow === 0) {
      if (cursor.getMonth() !== prevMonth) {
        colMonths[col] = MONTH_ABBR[cursor.getMonth()];
        prevMonth = cursor.getMonth();
      }
    }
    const key = dateKey(cursor.getTime());
    cells.push({ key, count: activityMap[key] || 0, col, row: dow });
    if (dow === 6) col++;
    cursor.setDate(cursor.getDate() + 1);
  }
  // Finish the current week's remaining days
  while (cursor.getDay() !== 1 /* Monday */) {
    const dow = (cursor.getDay() + 6) % 7;
    cells.push({ key: dateKey(cursor.getTime()), count: 0, col, row: dow, future: true });
    cursor.setDate(cursor.getDate() + 1);
  }
  col++; // final column count
  const totalCols = col;
  const svgW = totalCols * UNIT + DAY_LABEL_W;
  const svgH = LABEL_H + 7 * UNIT;

  const maxCount = Math.max(1, ...Object.values(activityMap));
  function cellBg(count, future) {
    if (future || count === 0) return 'var(--bg-sunk)';
    const r = count / maxCount;
    if (r < 0.25) return 'rgba(15,118,110,0.28)';
    if (r < 0.5)  return 'rgba(15,118,110,0.50)';
    if (r < 0.75) return 'rgba(15,118,110,0.72)';
    return 'rgba(15,118,110,0.96)';
  }

  // Most active day-of-week
  const dayTotals = Array(7).fill(0);
  cells.filter(c => !c.future).forEach(c => { dayTotals[c.row] += c.count; });
  const peakDay = WEEK_DAYS[dayTotals.indexOf(Math.max(...dayTotals))];

  const totalActive = Object.keys(activityMap).length;

  return (
    <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 22px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 6 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
          {t('progress.heatmap_title')}
        </h3>
        <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{t('progress.heatmap_subtitle')}</span>
      </div>

      <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
        <svg width={svgW} height={svgH} style={{ display: 'block' }}>
          {/* Month labels */}
          {Object.entries(colMonths).map(([c, label]) => (
            <text key={c} x={Number(c) * UNIT} y={12}
              style={{ fontSize: 9.5, fill: 'var(--text-faint)', fontFamily: 'var(--font-ui)', fontWeight: 600 }}>
              {label}
            </text>
          ))}
          {/* Cells */}
          {cells.map((c) => (
            <rect key={c.key}
              x={c.col * UNIT + DAY_LABEL_W}
              y={LABEL_H + c.row * UNIT}
              width={CELL} height={CELL} rx={2}
              fill={cellBg(c.count, c.future)}
              style={{ cursor: c.count > 0 ? 'default' : undefined }}
            >
              {!c.future && <title>{`${c.key}: ${c.count} words saved`}</title>}
            </rect>
          ))}
        </svg>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
            {t('progress.heatmap_most_active', peakDay)}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
            {totalActive} active days
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>Less</span>
          {['var(--bg-sunk)', 'rgba(15,118,110,0.28)', 'rgba(15,118,110,0.50)', 'rgba(15,118,110,0.72)', 'rgba(15,118,110,0.96)'].map((bg, i) => (
            <div key={i} style={{ width: 11, height: 11, borderRadius: 2, background: bg, border: '1px solid var(--border)', flexShrink: 0 }} />
          ))}
          <span style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>More</span>
        </div>
      </div>
    </div>
  );
}

// ---- Weekly SVG bar chart ----------------------------------------------------
function WeeklyBars({ weeks, t }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const tm = setTimeout(() => setAnimated(true), 250); return () => clearTimeout(tm); }, []);

  const hasData = weeks.some(w => w.count > 0);
  if (!hasData) {
    return (
      <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 22px', boxShadow: 'var(--shadow-sm)' }}>
        <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{t('progress.weekly_title')}</h3>
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-faint)' }}>{t('progress.weekly_no_data')}</p>
      </div>
    );
  }

  const maxCount = Math.max(...weeks.map(w => w.count), 1);
  const CHART_H = 120, BAR_W = 32, GAP = 10, PAD_L = 4, PAD_T = 20, PAD_B = 28;
  const totalW = weeks.length * (BAR_W + GAP) - GAP + PAD_L;
  const totalH = CHART_H + PAD_T + PAD_B;

  return (
    <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 22px', boxShadow: 'var(--shadow-sm)' }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{t('progress.weekly_title')}</h3>
      <div style={{ overflowX: 'auto' }}>
        <svg width={totalW} height={totalH} style={{ display: 'block', minWidth: '100%' }}>
          {/* Gridlines */}
          {[0.25, 0.5, 0.75, 1].map(f => (
            <line key={f}
              x1={PAD_L} x2={totalW}
              y1={PAD_T + CHART_H * (1 - f)}
              y2={PAD_T + CHART_H * (1 - f)}
              stroke="var(--border)" strokeDasharray="2 3"
            />
          ))}
          {/* Bars */}
          {weeks.map((w, i) => {
            const barH = animated ? Math.max(w.count > 0 ? 3 : 0, (w.count / maxCount) * CHART_H) : 0;
            const x = PAD_L + i * (BAR_W + GAP);
            const color = w.isCurrent ? 'var(--accent)' : 'var(--border-strong)';
            const dur = `${0.42 + i * 0.04}s`;
            return (
              <g key={i}>
                <rect
                  x={x} y={PAD_T + CHART_H - barH}
                  width={BAR_W} height={barH}
                  rx={4} fill={color}
                  style={{ transition: `height ${dur} cubic-bezier(.4,0,.2,1), y ${dur} cubic-bezier(.4,0,.2,1)` }}
                />
                {w.count > 0 && (
                  <text x={x + BAR_W / 2} y={PAD_T + CHART_H - barH - 4}
                    textAnchor="middle"
                    style={{ fontSize: 9, fill: w.isCurrent ? 'var(--accent)' : 'var(--text-faint)', fontFamily: 'var(--font-ui)', fontWeight: 600, transition: `y ${dur} cubic-bezier(.4,0,.2,1)` }}>
                    {w.count}
                  </text>
                )}
                <text x={x + BAR_W / 2} y={PAD_T + CHART_H + 18}
                  textAnchor="middle"
                  style={{ fontSize: 8, fill: 'var(--text-faint)', fontFamily: 'var(--font-ui)' }}>
                  {w.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ---- Donut chart (SVG) -------------------------------------------------------
function DonutChart({ cefrCounts, classified, t, onNavigate }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const tm = setTimeout(() => setAnimated(true), 200); return () => clearTimeout(tm); }, []);

  const r = 62, cx = 80, cy = 80, SW = 22;
  const circumference = 2 * Math.PI * r;

  const data = CEFR_LEVELS
    .map(l => ({ level: l, count: cefrCounts[l] || 0, color: CEFR_COLORS[l] }))
    .filter(d => d.count > 0);

  if (data.length === 0) {
    return (
      <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 22px', boxShadow: 'var(--shadow-sm)' }}>
        <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{t('progress.donut_title')}</h3>
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-faint)' }}>{t('progress.donut_no_data')}</p>
      </div>
    );
  }

  let offset = 0;
  const segments = data.map(d => {
    const dash = (d.count / classified) * circumference;
    const seg = { ...d, dash, offset };
    offset += dash;
    return seg;
  });

  return (
    <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 22px', boxShadow: 'var(--shadow-sm)' }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{t('progress.donut_title')}</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        {/* SVG donut */}
        <svg width={160} height={160} viewBox="0 0 160 160" style={{ flexShrink: 0 }}>
          {/* Track */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-sunk)" strokeWidth={SW} />
          {/* Segments */}
          {segments.map((seg, i) => (
            <circle key={seg.level}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={SW}
              strokeDasharray={`${animated ? seg.dash : 0} ${circumference}`}
              strokeDashoffset={circumference / 4 - seg.offset}
              style={{ transition: `stroke-dasharray ${0.65 + i * 0.12}s cubic-bezier(.4,0,.2,1)` }}
            />
          ))}
          {/* Center */}
          <text x={cx} y={cy - 5} textAnchor="middle"
            style={{ fontSize: 28, fontWeight: 800, fill: 'var(--text)', fontFamily: 'var(--font-ui)' }}>
            {classified}
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle"
            style={{ fontSize: 10, fill: 'var(--text-faint)', fontFamily: 'var(--font-ui)' }}>
            words
          </text>
        </svg>
        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1, minWidth: 110 }}>
          {segments.map(seg => (
            <div key={seg.level}
              style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: onNavigate ? 'pointer' : 'default' }}
              onClick={() => onNavigate?.(seg.level)}>
              <div style={{ width: 11, height: 11, borderRadius: 3, background: seg.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: seg.color, width: 22 }}>{seg.level}</span>
              <span style={{ fontSize: 12, color: 'var(--text-faint)', flex: 1 }}>
                {CEFR_LABELS[seg.level]?.split(' · ')[1]}
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>{seg.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- Reading pace card -------------------------------------------------------
function ReadingPaceCard({ thisWeek, lastWeek, streak, t }) {
  let compText = null, compColor = 'var(--text-soft)';
  if (lastWeek > 0) {
    const pct = Math.round(Math.abs((thisWeek - lastWeek) / lastWeek) * 100);
    if (thisWeek > lastWeek)      { compText = t('progress.pace_up', pct);   compColor = '#22c55e'; }
    else if (thisWeek < lastWeek) { compText = t('progress.pace_down', pct); compColor = '#ef4444'; }
    else                          { compText = t('progress.pace_same'); }
  }

  const motivation =
    streak === 0 ? t('progress.pace_msg_0') :
    streak < 7   ? t('progress.pace_msg_1_6') :
    streak < 30  ? t('progress.pace_msg_7_29', streak) :
    t('progress.pace_msg_30', streak);

  return (
    <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 22px', boxShadow: 'var(--shadow-sm)' }}>
      <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{t('progress.pace_title')}</h3>
      <div style={{ fontSize: 34, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-.03em', lineHeight: 1, marginBottom: 4 }}>
        {thisWeek.toLocaleString()}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text-faint)', marginBottom: compText ? 8 : 10 }}>
        {t('progress.pace_this_week', thisWeek)}
      </div>
      {compText && (
        <div style={{ fontSize: 13, fontWeight: 600, color: compColor, marginBottom: 10 }}>{compText}</div>
      )}
      <div style={{ fontSize: 13.5, color: 'var(--text-soft)', lineHeight: 1.5 }}>{motivation}</div>
    </div>
  );
}

// ---- SM2 review health -------------------------------------------------------
function SM2Health({ health, dueToday, dueThisWeek, t }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const tm = setTimeout(() => setAnimated(true), 300); return () => clearTimeout(tm); }, []);

  const total = health.new + health.learning + health.reviewing + health.mastered;
  const categories = [
    { key: 'new',       emoji: '🌱', count: health.new,       color: '#22c55e' },
    { key: 'learning',  emoji: '📖', count: health.learning,  color: '#3b82f6' },
    { key: 'reviewing', emoji: '🧠', count: health.reviewing, color: '#8b5cf6' },
    { key: 'mastered',  emoji: '⭐', count: health.mastered,  color: '#f59e0b' },
  ];

  return (
    <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 22px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{t('progress.sm2_title')}</h3>
        <div style={{ display: 'flex', gap: 12 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: dueToday > 0 ? '#ef4444' : 'var(--text-faint)' }}>
            {t('progress.sm2_due_today', dueToday)}
          </span>
          <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-faint)' }}>
            {t('progress.sm2_upcoming', dueThisWeek)}
          </span>
        </div>
      </div>

      {/* Stacked proportion bar */}
      {total > 0 && (
        <div style={{ height: 10, background: 'var(--bg-sunk)', borderRadius: 99, overflow: 'hidden', display: 'flex', marginBottom: 16 }}>
          {categories.map(cat => cat.count > 0 && (
            <div key={cat.key} title={`${cat.count} words`} style={{
              height: '100%',
              width: animated ? `${(cat.count / total) * 100}%` : '0%',
              background: cat.color,
              transition: 'width 0.75s cubic-bezier(.4,0,.2,1)',
            }} />
          ))}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px 12px' }}>
        {categories.map(cat => (
          <div key={cat.key} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 15, lineHeight: 1, flexShrink: 0 }}>{cat.emoji}</span>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-faint)', lineHeight: 1 }}>
                {t(`progress.sm2_${cat.key}`)}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: cat.color, lineHeight: 1.3 }}>{cat.count}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Personal bests ----------------------------------------------------------
function PersonalBests({ bestDay, longestText, longestStreak, t }) {
  const items = [
    bestDay && {
      emoji: '🏆',
      label: t('progress.bests_title_day'),
      value: t('progress.bests_best_day', bestDay.count, new Date(bestDay.date + 'T12:00:00').toLocaleDateString(undefined, { month: 'long', day: 'numeric' })),
    },
    longestText && longestText.count > 0 && {
      emoji: '📚',
      label: t('progress.bests_title_text'),
      value: t('progress.bests_longest_text', longestText.title, longestText.count.toLocaleString()),
    },
    longestStreak > 0 && {
      emoji: '🔥',
      label: t('progress.bests_title_streak'),
      value: t('progress.bests_longest_streak', longestStreak),
    },
  ].filter(Boolean);

  return (
    <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 22px', boxShadow: 'var(--shadow-sm)' }}>
      <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{t('progress.bests_title')}</h3>
      {items.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-faint)' }}>
          Keep reading to set personal records!
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
              <span style={{ fontSize: 20, lineHeight: '20px', flexShrink: 0 }}>{item.emoji}</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', lineHeight: 1.35 }}>
                  {item.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Reclassify button -------------------------------------------------------
function ReclassifyButton({ words, onDone, t }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const unclassified = words.filter(w => !w.cefr).length;

  const run = async () => {
    setLoading(true);
    const updated = [...words];
    for (const w of updated) {
      if (!w.cefr) w.cefr = await getCefrLevel(w.word).catch(() => null);
    }
    save(WORDS_KEY, updated);
    onDone(updated);
    setLoading(false);
    setDone(true);
  };

  if (!unclassified) return null;
  return (
    <button onClick={run} disabled={loading}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-sunk)', color: loading ? 'var(--text-faint)' : 'var(--text)', cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
      <Icon name={loading ? 'loader' : done ? 'check' : 'sparkle'} size={15} />
      {loading ? t('progress.classifying') : done ? t('progress.classify_done') : t('progress.classify', unclassified)}
    </button>
  );
}

// ---- Section card wrapper (label) -------------------------------------------
function Section({ children, style }) {
  return (
    <div style={{ ...style }}>
      {children}
    </div>
  );
}

// ---- Main page ---------------------------------------------------------------
export default function Progress({ words: initialWords, texts = [], reads = {}, t, onWordsUpdated, onNavigateToWords }) {
  const [words, setWords] = useState(initialWords);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 700);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 700);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  // Sync classify (instant, uses bundled data)
  const enriched = useMemo(() => words.map(w => ({ ...w, cefr: w.cefr || getCefrLevelSync(w.word) })), [words]);

  // CEFR counts
  const { cefrCounts, classified } = useMemo(() => {
    const c = Object.fromEntries(CEFR_LEVELS.map(l => [l, 0]));
    let unknown = 0;
    for (const w of enriched) {
      if (w.cefr && c[w.cefr] !== undefined) c[w.cefr]++;
      else unknown++;
    }
    return { cefrCounts: { ...c, unknown }, classified: enriched.length - unknown };
  }, [enriched]);

  // Activity map: date key → words saved count
  const activityMap = useMemo(() => {
    const map = {};
    for (const w of words) {
      if (!w.savedAt) continue;
      const k = dateKey(w.savedAt);
      map[k] = (map[k] || 0) + 1;
    }
    return map;
  }, [words]);

  // Streak: best of review streak (localStorage) and word-save streak
  const { streak, longestStreak } = useMemo(() => {
    const reviewData = load(STREAK_KEY, { streak: 0, studyMap: {} });
    const sortedDays = Object.keys(activityMap).sort();
    let saveCur = 0;
    const today = dateKey(Date.now());
    // Walk backwards from today
    const cur2 = new Date();
    for (let i = 0; i < 365; i++) {
      const k = dateKey(cur2.getTime());
      if (!activityMap[k]) break;
      saveCur++;
      cur2.setDate(cur2.getDate() - 1);
    }
    return {
      streak: Math.max(reviewData.streak || 0, saveCur),
      longestStreak: Math.max(computeLongestStreak(activityMap), reviewData.streak || 0),
    };
  }, [activityMap]);

  // Texts read count
  const textsRead = Object.keys(reads).length;

  // Total reading time estimate (words in read texts ÷ 200 wpm → minutes → hours)
  const totalReadHours = useMemo(() => {
    const readTexts = texts.filter(tx => reads[tx.id]);
    const minutes = readTexts.reduce((s, tx) => s + countWords(tx.body) / 200, 0);
    return Math.max(0, Math.round(minutes / 60));
  }, [texts, reads]);

  // Weekly data (last 8 weeks)
  const weeklyData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 8 }, (_, i) => {
      const weekEnd = mondayOf(new Date(now.getTime() - (7 - i - 1) * 7 * 86400000));
      // Offset by the current week's position
      // Simpler: just compute each week from 7 weeks ago
      const offset = 7 - i - 1;
      const wS = mondayOf(new Date(now.getTime() - offset * 7 * 86400000));
      const wE = new Date(wS.getTime() + 7 * 86400000);
      const count = words.filter(w => w.savedAt >= wS.getTime() && w.savedAt < wE.getTime()).length;
      return { count, label: weekLabel(wS), isCurrent: i === 7 };
    });
  }, [words]);

  const thisWeek = weeklyData[7]?.count ?? 0;
  const lastWeek = weeklyData[6]?.count ?? 0;

  // SM2 health breakdown
  const sm2Health = useMemo(() => ({
    new:       words.filter(w => !w.sm2_interval || w.sm2_interval < 1).length,
    learning:  words.filter(w => (w.sm2_interval ?? 0) >= 1 && w.sm2_interval < 7).length,
    reviewing: words.filter(w => (w.sm2_interval ?? 0) >= 7 && w.sm2_interval < 30).length,
    mastered:  words.filter(w => (w.sm2_interval ?? 0) >= 30).length,
  }), [words]);

  const now = Date.now();
  const DAY = 86400000;
  const dueToday = words.filter(w => w.definition && (!w.sm2_nextReview || w.sm2_nextReview <= now)).length;
  const dueThisWeek = words.filter(w => w.definition && w.sm2_nextReview > now && w.sm2_nextReview <= now + 7 * DAY).length;

  // Personal bests
  const { bestDay, longestText } = useMemo(() => {
    const byDay = Object.entries(activityMap);
    const best = byDay.length > 0 ? byDay.sort((a, b) => b[1] - a[1])[0] : null;
    const longest = texts.reduce((b, tx) => {
      const wc = countWords(tx.body);
      return (!b || wc > b.count) ? { title: tx.title, count: wc } : b;
    }, null);
    return {
      bestDay: best ? { date: best[0], count: best[1] } : null,
      longestText: longest,
    };
  }, [activityMap, texts]);

  const total = enriched.length;

  // ---- Empty state -----------------------------------------------------------
  if (total === 0) {
    return (
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <PageHeader title={t('progress.title')} subtitle={t('progress.subtitle_empty')} />
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-faint)' }}>
          <Icon name="chart" size={40} stroke={1.3} style={{ marginBottom: 16, display: 'block', margin: '0 auto 16px' }} />
          <p style={{ fontSize: 15, margin: 0 }}>{t('progress.empty_body')}</p>
        </div>
      </div>
    );
  }

  const col2 = isMobile ? '1fr' : '1fr 1fr';

  // ---- Full dashboard -------------------------------------------------------
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', animation: 'fadeUp .35s ease' }}>
      <PageHeader
        title={t('progress.title')}
        subtitle={t('progress.subtitle', total)}
        action={
          <ReclassifyButton words={words} t={t}
            onDone={(updated) => { setWords(updated); onWordsUpdated?.(updated); }} />
        }
      />

      {/* 1 ── Hero stats ──────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
        <HeroCard emoji="📚" value={textsRead}       label={t('progress.hero_texts_read')}   color="var(--accent)"  delay={0} />
        <HeroCard emoji="🔤" value={total}            label={t('progress.hero_words_saved')}  color="#3b82f6"        delay={80} />
        <HeroCard emoji="🔥" value={streak}           label={t('progress.hero_streak')}       color="#f59e0b"        delay={160} />
        <HeroCard emoji="⏱️" value={totalReadHours}   label={t('progress.hero_reading_time')} color="#8b5cf6"        delay={240} />
      </div>

      {/* 2 ── Vocabulary level + Reading pace (left) ─────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: col2, gap: 14, marginBottom: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <CefrJourney wordCount={total} t={t} />
          <ReadingPaceCard thisWeek={thisWeek} lastWeek={lastWeek} streak={streak} t={t} />
        </div>
        {/* 3 ── Donut + Personal bests (right) ─────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <DonutChart cefrCounts={cefrCounts} classified={classified || 1} t={t} onNavigate={onNavigateToWords} />
          <PersonalBests bestDay={bestDay} longestText={longestText} longestStreak={longestStreak} t={t} />
        </div>
      </div>

      {/* 4 ── SM2 review health ───────────────────────────────────────────── */}
      <div style={{ marginBottom: 14 }}>
        <SM2Health health={sm2Health} dueToday={dueToday} dueThisWeek={dueThisWeek} t={t} />
      </div>

      {/* 5 ── Activity heatmap ────────────────────────────────────────────── */}
      <div style={{ marginBottom: 14 }}>
        <ActivityHeatmap activityMap={activityMap} t={t} />
      </div>

      {/* 6 ── Weekly bar chart ────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <WeeklyBars weeks={weeklyData} t={t} />
      </div>
    </div>
  );
}
