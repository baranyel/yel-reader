import { useState, useMemo } from 'react';
import { Icon, Button, IconButton, DeleteButton, PageHeader, EmptyState } from '../components/ui.jsx';
import { relativeTime } from '../utils/storage.js';
import { CEFR_LEVELS, CEFR_COLORS, getCefrLevelSync } from '../utils/cefrWords.js';

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function exportCSV(words) {
  const esc = (v) => `"${(v || '').replace(/"/g, '""')}"`;
  const header = 'Word,Definition,Example,Note,Source\n';
  const rows = words.map((w) => [w.word, w.definition || '', w.example || '', w.note || '', w.sourceTitle].map(esc).join(',')).join('\n');
  downloadFile(header + rows, 'yelreader-words.csv', 'text/csv;charset=utf-8');
}

function exportAnki(words) {
  const rows = words.map((w) => `${w.word}\t${[w.definition, w.example, w.note].filter(Boolean).join(' | ')}`).join('\n');
  downloadFile(rows, 'yelreader-anki.txt', 'text/plain;charset=utf-8');
}

function WordRow({ entry, index, onDelete, onOpenSource, onUpdateNote }) {
  const [hover, setHover] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(entry.note || '');

  const saveNote = () => {
    onUpdateNote(entry.word, noteText);
    setEditingNote(false);
  };

  // SM-2 status
  const now = Date.now();
  const isDue = entry.sm2_nextReview && entry.sm2_nextReview <= now;
  const daysUntil = entry.sm2_nextReview
    ? Math.max(0, Math.ceil((entry.sm2_nextReview - now) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        background: 'var(--bg-elev)', border: '1px solid var(--border)',
        borderColor: hover ? 'var(--border-strong)' : 'var(--border)',
        borderRadius: 'var(--radius)', padding: '14px 18px',
        boxShadow: hover ? 'var(--shadow-sm)' : 'none',
        transition: 'border-color .18s, box-shadow .18s',
        animation: 'fadeUp .35s ease both',
        animationDelay: `${index * 40}ms`,
      }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        {/* Word + definition + note */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--reading-font)', fontSize: 19, fontWeight: 600, color: 'var(--text)' }}>
              {entry.word}
            </span>
            {entry.pos && entry.pos !== '—' && (
              <span style={{ fontSize: 11, fontWeight: 600, fontStyle: 'italic', color: 'var(--text-faint)', background: 'var(--bg-sunk)', border: '1px solid var(--border)', padding: '1px 8px', borderRadius: 99 }}>
                {entry.pos}
              </span>
            )}
            {daysUntil !== null && !isDue && (
              <span style={{ fontSize: 11, color: 'var(--text-faint)', background: 'var(--bg-sunk)', border: '1px solid var(--border)', padding: '1px 7px', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Icon name="clock" size={11} /> {daysUntil}d
              </span>
            )}
            {isDue && (
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '1px 7px', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Icon name="repeat" size={11} /> due
              </span>
            )}
          </div>
          {entry.definition && (
            <p style={{ margin: '5px 0 0', fontSize: 13.5, color: 'var(--text-soft)', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {entry.definition}
            </p>
          )}

          {/* Note section */}
          {editingNote ? (
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={2} autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveNote(); } if (e.key === 'Escape') setEditingNote(false); }}
                style={{ flex: 1, resize: 'none', border: '1px solid var(--accent)', outline: 'none', borderRadius: 'var(--radius-sm)', background: 'var(--bg-sunk)', padding: '7px 10px', fontSize: 13, lineHeight: 1.5, color: 'var(--text)', fontFamily: 'var(--font-ui)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button onClick={saveNote} style={{ padding: '5px 10px', fontSize: 12.5, fontWeight: 600, border: 'none', borderRadius: 'var(--radius-sm)', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>✓</button>
                <button onClick={() => setEditingNote(false)} style={{ padding: '5px 10px', fontSize: 12.5, border: 'none', borderRadius: 'var(--radius-sm)', background: 'var(--bg-sunk)', color: 'var(--text-faint)', cursor: 'pointer' }}>✕</button>
              </div>
            </div>
          ) : entry.note ? (
            <div style={{ marginTop: 9, display: 'flex', alignItems: 'flex-start', gap: 7 }}>
              <Icon name="pen" size={13} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.5, flex: 1 }}>{entry.note}</p>
              <IconButton name="edit" size={13} title="Edit note" onClick={() => { setNoteText(entry.note); setEditingNote(true); }} style={{ flexShrink: 0 }} />
            </div>
          ) : hover && (
            <button onClick={() => { setNoteText(''); setEditingNote(true); }}
              style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--text-faint)', background: 'transparent', border: '1px dashed var(--border)', borderRadius: 99, padding: '3px 10px', cursor: 'pointer' }}>
              <Icon name="pen" size={12} /> Not ekle
            </button>
          )}
        </div>

        {/* Meta + actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button onClick={() => onOpenSource(entry.sourceId)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, color: 'var(--text-faint)', background: 'transparent', border: '1px solid var(--border)', borderRadius: 99, padding: '4px 10px', maxWidth: 150, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            <Icon name="doc" size={12} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.sourceTitle}</span>
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>{relativeTime(entry.savedAt)}</span>
          <DeleteButton onConfirm={() => onDelete(entry.word)} label="word" />
        </div>
      </div>
    </div>
  );
}

export default function MyWords({ words, onDelete, onOpenSource, onBrowse, onStartQuiz, onUpdateNote, initialCefrFilter, onCefrFilterClear, t }) {
  const [query, setQuery] = useState('');
  const [focus, setFocus] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [cefrFilter, setCefrFilter] = useState(initialCefrFilter || null);

  const enriched = useMemo(() => words.map((w) => ({ ...w, cefr: w.cefr || getCefrLevelSync(w.word) })), [words]);

  const cefrCounts = useMemo(() => {
    const c = Object.fromEntries(CEFR_LEVELS.map((l) => [l, 0]));
    for (const w of enriched) { if (w.cefr && c[w.cefr] !== undefined) c[w.cefr]++; }
    return c;
  }, [enriched]);

  const wordsWithDefs = words.filter((w) => w.definition);
  const quizReady = wordsWithDefs.length >= 4;
  const quizNeeded = Math.max(0, 4 - wordsWithDefs.length);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = enriched;
    if (cefrFilter) result = result.filter((w) => w.cefr === cefrFilter);
    if (!q) return result;
    return result.filter((w) =>
      w.word.toLowerCase().includes(q) ||
      w.sourceTitle.toLowerCase().includes(q) ||
      (w.definition || '').toLowerCase().includes(q) ||
      (w.note || '').toLowerCase().includes(q)
    );
  }, [enriched, query, cefrFilter]);

  return (
    <div style={{ maxWidth: 920, margin: '0 auto' }}>
      <PageHeader
        title={t('myWords.title')}
        subtitle={t('myWords.subtitle', words.length)}
        action={
          words.length > 0 && (
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ position: 'relative' }}>
                <Button variant="secondary" icon="download" onClick={() => setShowExportMenu((v) => !v)}>
                  {t('myWords.export')}
                </Button>
                {showExportMenu && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 499 }} onClick={() => setShowExportMenu(false)} />
                    <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 6, zIndex: 500, background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden', minWidth: 180 }}>
                      {[
                        { label: t('myWords.export_csv'), action: () => { exportCSV(words); setShowExportMenu(false); } },
                        { label: t('myWords.export_anki'), action: () => { exportAnki(words); setShowExportMenu(false); } },
                      ].map((item) => (
                        <button key={item.label} onClick={item.action}
                          style={{ display: 'block', width: '100%', padding: '11px 16px', fontSize: 14, fontWeight: 500, color: 'var(--text)', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <Button variant="primary" icon="zap" onClick={quizReady ? onStartQuiz : undefined}
                disabled={!quizReady} title={!quizReady ? t('myWords.need_defs', quizNeeded) : undefined}>
                {t('myWords.quiz_start')}
              </Button>
            </div>
          )
        }
      />

      {!quizReady && words.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-sunk)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: 18, fontSize: 13.5, color: 'var(--text-faint)' }}>
          <Icon name="zap" size={16} style={{ color: 'var(--accent)' }} />
          {t('myWords.need_defs', quizNeeded)} · {t('quiz.need_more_hint')}
        </div>
      )}

      {words.length > 0 && (
        <>
          {/* CEFR filter pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {CEFR_LEVELS.filter((l) => cefrCounts[l] > 0).map((level) => {
              const active = cefrFilter === level;
              return (
                <button key={level} onClick={() => { setCefrFilter(active ? null : level); if (active) onCefrFilterClear?.(); }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 700, padding: '4px 11px', borderRadius: 99, border: `1.5px solid ${active ? CEFR_COLORS[level] : `${CEFR_COLORS[level]}44`}`, background: active ? `color-mix(in srgb, ${CEFR_COLORS[level]} 14%, var(--bg-elev))` : 'transparent', color: active ? CEFR_COLORS[level] : 'var(--text-faint)', cursor: 'pointer', transition: 'all .14s' }}>
                  {level}
                  <span style={{ fontSize: 11, fontWeight: 600, opacity: .75 }}>{cefrCounts[level]}</span>
                </button>
              );
            })}
            {cefrFilter && (
              <button onClick={() => { setCefrFilter(null); onCefrFilterClear?.(); }}
                style={{ fontSize: 12, color: 'var(--text-faint)', background: 'transparent', border: '1px dashed var(--border)', borderRadius: 99, padding: '4px 10px', cursor: 'pointer' }}>
                <Icon name="x" size={11} /> Temizle
              </button>
            )}
          </div>

          {/* Search bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', height: 46, background: 'var(--bg-elev)', border: '1px solid', borderColor: focus ? 'var(--accent)' : 'var(--border)', borderRadius: 'var(--radius)', boxShadow: focus ? '0 0 0 3px var(--accent-soft)' : 'var(--shadow-sm)', marginBottom: 18, transition: 'border-color .16s, box-shadow .16s' }}>
            <Icon name="search" size={18} style={{ color: 'var(--text-faint)' }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
              placeholder={t('myWords.search_ph')}
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14.5, color: 'var(--text)', fontFamily: 'var(--font-ui)' }} />
            {query && <IconButton name="x" size={15} onClick={() => setQuery('')} />}
          </div>
        </>
      )}

      {words.length === 0 ? (
        <EmptyState icon="bookmark" title={t('myWords.empty_title')} body={t('myWords.empty_body')}
          action={<Button variant="primary" icon="library" onClick={onBrowse}>{t('myWords.browse')}</Button>} />
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-faint)' }}>
          <Icon name="search" size={34} stroke={1.4} />
          <p style={{ marginTop: 14, fontSize: 15 }}>{t('myWords.no_match', query)}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((w, i) => (
            <WordRow key={w.word + w.sourceId} entry={w} index={i}
              onDelete={onDelete} onOpenSource={onOpenSource}
              onUpdateNote={onUpdateNote} />
          ))}
        </div>
      )}
    </div>
  );
}
