import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Icon, Button, Skel } from '../components/ui.jsx';
import WordPopup from '../components/WordPopup.jsx';
import NoteEditor from '../components/NoteEditor.jsx';
import { wordCount, relativeTime, readingTime, saveProgress, getProgress, saveNote, deleteNote } from '../utils/storage.js';
import { cleanWord, extractSentence } from '../utils/dictionary.js';

// ---- Pagination -------------------------------------------------------------
const WORDS_PER_PAGE = 900;
const MIN_WORDS = 1600;

function paginateText(paragraphs) {
  const total = paragraphs.reduce((s, p) => s + (p.match(/\S+/g)?.length || 0), 0);
  if (total <= MIN_WORDS) return [paragraphs];
  const pages = [];
  let page = [], count = 0;
  for (const para of paragraphs) {
    const wc = para.match(/\S+/g)?.length || 0;
    if (count >= WORDS_PER_PAGE && page.length > 0) { pages.push(page); page = []; count = 0; }
    page.push(para);
    count += wc;
  }
  if (page.length) pages.push(page);
  return pages;
}

// ---- Context menu -----------------------------------------------------------
function ParagraphContextMenu({ x, y, hasNote, onAddNote, onEditNote, onDeleteNote, onClose, t }) {
  const ref = useRef(null);

  useEffect(() => {
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown, true); document.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const vw = window.innerWidth, vh = window.innerHeight;
  const menuW = 190, menuH = 120;
  const left = Math.min(x, vw - menuW - 8);
  const top = Math.min(y, vh - menuH - 8);

  const item = (label, icon, onClick, danger) => (
    <button onClick={() => { onClick(); onClose(); }} style={{
      display: 'flex', alignItems: 'center', gap: 9, width: '100%',
      padding: '8px 12px', border: 'none', background: 'transparent',
      color: danger ? '#c0392b' : 'var(--text)', fontSize: 13.5, fontWeight: 500,
      cursor: 'pointer', borderRadius: 6, transition: 'background .12s', textAlign: 'left',
    }}
      onMouseEnter={(e) => e.currentTarget.style.background = danger ? 'color-mix(in srgb,#c0392b 10%,transparent)' : 'var(--surface-hover)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
      <Icon name={icon} size={15} /> {label}
    </button>
  );

  return (
    <div ref={ref} style={{
      position: 'fixed', top, left, zIndex: 9500,
      background: 'var(--bg-elev)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-lg)',
      padding: 4, minWidth: menuW, animation: 'popIn .14s ease',
    }}>
      {!hasNote && item(t('ctxMenu.add_note'), 'note', onAddNote)}
      {hasNote && item(t('ctxMenu.edit_note'), 'pen', onEditNote)}
      {hasNote && item(t('ctxMenu.delete_note'), 'trash', onDeleteNote, true)}
    </div>
  );
}

// ---- Reading body -----------------------------------------------------------
function ReadingBody({ paragraphs, pageStartIndex, savedSet, activeKey, onWord, highlightMap, noteIndices, onContextMenu }) {
  let counter = 0;
  return (
    <div style={{ fontFamily: 'var(--reading-font)', fontSize: 'var(--reading-size)', lineHeight: 1.8, color: 'var(--text)', letterSpacing: '.002em' }}>
      {paragraphs.map((para, pi) => {
        const globalIdx = pageStartIndex + pi;
        const hasNote = noteIndices.has(globalIdx);
        const tokens = para.match(/[A-Za-z']+|[^A-Za-z']+/g) || [];
        return (
          <p key={pi} style={{ margin: '0 0 1.25em', textWrap: 'pretty', position: 'relative' }}
            onContextMenu={(e) => { e.preventDefault(); onContextMenu(e.clientX, e.clientY, globalIdx, para); }}>
            {hasNote && (
              <span style={{ position: 'absolute', left: -24, top: 5, color: 'var(--accent)', opacity: .8, cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); onContextMenu(e.clientX, e.clientY, globalIdx, para); }}>
                <Icon name="note" size={14} />
              </span>
            )}
            {tokens.map((tok, ti) => {
              if (/^[A-Za-z']+$/.test(tok)) {
                const base = cleanWord(tok);
                const key = 'w' + (counter++);
                const hlColor = highlightMap?.[base];
                const hlClass = hlColor ? ` hl-${hlColor}` : '';
                const cls = 'rw' + (savedSet.has(base) ? ' saved' : '') + (activeKey === key ? ' active' : '') + hlClass;
                return (
                  <span key={key} data-wkey={key} className={cls}
                    onClick={(e) => onWord(e.currentTarget, tok, key, para)}>
                    {tok}
                  </span>
                );
              }
              return <span key={'s' + pi + '_' + ti}>{tok}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
}

// ---- Main component ---------------------------------------------------------
export default function ReadText({
  text, savedWords, onSaveWord, onBack, loading, progress, t, definitionOptions,
  highlights, onHighlight, onUpdateNote, onPageChange, notes, onNoteSaved, onNoteDeleted,
}) {
  const [active, setActive] = useState(null);
  const [ctxMenu, setCtxMenu] = useState(null);
  const [noteEditor, setNoteEditor] = useState(null);
  const [showTapHint, setShowTapHint] = useState(() => !localStorage.getItem('tapHintSeen'));

  const allParagraphs = useMemo(
    () => text.body.split(/\n+/).filter((p) => p.trim().length > 0),
    [text.body]
  );
  const pages = useMemo(() => paginateText(allParagraphs), [allParagraphs]);
  const totalPages = pages.length;
  const isPaginated = totalPages > 1;

  const [currentPage, setCurrentPage] = useState(() => {
    const saved = getProgress(text.id);
    return saved ? Math.min(saved.page, totalPages - 1) : 0;
  });

  const [resumeBanner, setResumeBanner] = useState(() => {
    const saved = getProgress(text.id);
    return saved && saved.page > 0 ? saved.page + 1 : null;
  });

  useEffect(() => {
    if (!resumeBanner) return;
    const id = setTimeout(() => setResumeBanner(null), 4000);
    return () => clearTimeout(id);
  }, [resumeBanner]);

  useEffect(() => {
    if (isPaginated) saveProgress(text.id, currentPage);
  }, [text.id, currentPage, isPaginated]);

  useEffect(() => { setActive(null); setCtxMenu(null); }, [text?.id, currentPage]);

  const pageStartIndex = useMemo(() => {
    let idx = 0;
    for (let p = 0; p < currentPage; p++) idx += pages[p].length;
    return idx;
  }, [pages, currentPage]);

  const noteIndices = useMemo(() => {
    const s = new Set();
    Object.values(notes || {}).forEach((n) => { if (n.textId === text.id) s.add(n.paragraphIndex); });
    return s;
  }, [notes, text.id]);

  const getNoteForPara = useCallback((paraIdx) =>
    Object.values(notes || {}).find((n) => n.textId === text.id && n.paragraphIndex === paraIdx) || null,
    [notes, text.id]
  );

  const handleWord = useCallback((el, tok, key, paragraphText) => {
    const context = extractSentence(paragraphText, tok);
    setActive((cur) => (cur && cur.key === key ? null : { el, word: tok, key, context }));
    if (showTapHint) {
      setShowTapHint(false);
      localStorage.setItem('tapHintSeen', '1');
    }
  }, [showTapHint]);

  const goToPage = useCallback((idx) => {
    setCurrentPage(idx);
    setActive(null);
    setCtxMenu(null);
    onPageChange?.();
  }, [onPageChange]);

  const handleContextMenu = useCallback((x, y, paraIdx, paraText) => {
    setActive(null);
    setCtxMenu({ x, y, paraIdx, paraText });
  }, []);

  const openNoteEditor = useCallback((paraIdx, paraText) => {
    setNoteEditor({ paraIdx, paraText, note: getNoteForPara(paraIdx) });
  }, [getNoteForPara]);

  const handleNoteSave = useCallback((note) => {
    saveNote(note);
    onNoteSaved?.(note);
    setNoteEditor(null);
  }, [onNoteSaved]);

  const handleNoteDelete = useCallback(() => {
    const n = noteEditor?.note;
    if (n) { deleteNote(n.id); onNoteDeleted?.(n.id); }
    setNoteEditor(null);
  }, [noteEditor, onNoteDeleted]);

  const overallPct = isPaginated
    ? Math.round(((currentPage + progress) / totalPages) * 100)
    : Math.round(progress * 100);

  const savedSet = new Set(savedWords.map((w) => w.word));
  const noteMap = Object.fromEntries(savedWords.filter(w => w.note).map(w => [w.word, w.note]));
  const activeClean = active ? cleanWord(active.word) : null;
  const pageParas = pages[currentPage] || [];
  const totalWc = wordCount(text.body);

  if (loading) {
    return (
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '12px 0 80px' }}>
        <Skel w={90} h={20} style={{ marginBottom: 30 }} />
        <Skel w="80%" h={34} style={{ marginBottom: 28 }} />
        {Array.from({ length: 9 }).map((_, i) => (
          <Skel key={i} w={i % 4 === 3 ? '55%' : '100%'} h={15} style={{ marginBottom: 16 }} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 0 120px' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 }}>
          <Button variant="ghost" icon="arrowLeft" size="sm" onClick={onBack}>{t('readText.back')}</Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isPaginated && (
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-faint)', background: 'var(--bg-sunk)', border: '1px solid var(--border)', padding: '4px 12px', borderRadius: 99 }}>
                {t('readText.page_of', currentPage + 1, totalPages)}
              </span>
            )}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: 'var(--text-faint)' }}>
              <span style={{ position: 'relative', width: 22, height: 22 }}>
                <svg width="22" height="22" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="18" cy="18" r="15" fill="none" stroke="var(--border)" strokeWidth="4" />
                  <circle cx="18" cy="18" r="15" fill="none" stroke="var(--accent)" strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 15}
                    strokeDashoffset={2 * Math.PI * 15 * (1 - (isPaginated ? (currentPage + progress) / totalPages : progress))}
                    style={{ transition: 'stroke-dashoffset .12s linear' }} />
                </svg>
              </span>
              {t('readText.pct', overallPct)}
            </span>
          </div>
        </div>

        {/* Resume banner */}
        {resumeBanner && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 20, padding: '9px 14px', background: 'var(--accent-soft)', border: '1px solid color-mix(in srgb,var(--accent) 30%,transparent)', borderRadius: 'var(--radius)', fontSize: 13.5, color: 'var(--accent)', fontWeight: 500, animation: 'fadeUp .3s ease' }}>
            <Icon name="bookmark" size={16} />
            {t('readText.resume', resumeBanner)}
          </div>
        )}

        {/* Header */}
        <header style={{ marginBottom: 30 }}>
          <h1 style={{ margin: 0, fontFamily: 'var(--reading-font)', fontSize: 38, fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1.15, color: 'var(--text)' }}>
            {text.title}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, fontSize: 13, color: 'var(--text-faint)', fontWeight: 500, flexWrap: 'wrap' }}>
            <span>{readingTime(totalWc)}</span>
            <span style={{ width: 3, height: 3, borderRadius: 99, background: 'var(--text-faint)' }} />
            <span>Saved {relativeTime(text.savedAt)}</span>
            {isPaginated && (<><span style={{ width: 3, height: 3, borderRadius: 99, background: 'var(--text-faint)' }} /><span>{totalPages} pages</span></>)}
          </div>
          {showTapHint && (
            <div style={{ marginTop: 18, display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--text-faint)', background: 'var(--bg-sunk)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 99 }}>
              <Icon name="sparkle" size={14} style={{ color: 'var(--accent)' }} />
              {t('readText.tap_hint')}
            </div>
          )}
        </header>

        {/* Reading body — left-padded for note indicators */}
        <div style={{ paddingLeft: 28 }}>
          <ReadingBody
            paragraphs={pageParas}
            pageStartIndex={pageStartIndex}
            savedSet={savedSet}
            activeKey={active?.key}
            onWord={handleWord}
            highlightMap={highlights}
            noteIndices={noteIndices}
            onContextMenu={handleContextMenu}
          />
        </div>

        {/* Page navigation */}
        {isPaginated && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
            <Button variant="secondary" icon="arrowLeft" disabled={currentPage === 0} onClick={() => goToPage(currentPage - 1)}>
              {t('readText.prev_page')}
            </Button>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {totalPages <= 9 ? (
                Array.from({ length: totalPages }).map((_, i) => (
                  <button key={i} onClick={() => goToPage(i)} style={{ width: i === currentPage ? 20 : 8, height: 8, borderRadius: 99, border: 'none', background: i === currentPage ? 'var(--accent)' : 'var(--border)', cursor: 'pointer', transition: 'all .18s ease', padding: 0 }} />
                ))
              ) : (
                <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-faint)' }}>{currentPage + 1} / {totalPages}</span>
              )}
            </div>
            <Button variant={currentPage === totalPages - 1 ? 'secondary' : 'primary'} iconRight="chevronRight" disabled={currentPage === totalPages - 1} onClick={() => goToPage(currentPage + 1)}>
              {currentPage === totalPages - 1 ? t('readText.finished') : t('readText.next_page')}
            </Button>
          </div>
        )}
      </div>

      {/* Word popup */}
      {active && (
        <WordPopup targetEl={active.el} word={active.word} context={active.context}
          savedSet={savedSet}
          onSave={(word, defData) => onSaveWord(word, text, defData)}
          onClose={() => setActive(null)}
          definitionOptions={definitionOptions} t={t}
          currentHighlight={highlights?.[activeClean] || null}
          onHighlight={onHighlight ? (color) => onHighlight(activeClean, color) : undefined}
          wordNote={noteMap[activeClean] || ''}
          onUpdateNote={onUpdateNote ? (note) => onUpdateNote(activeClean, note) : undefined}
        />
      )}

      {/* Paragraph context menu */}
      {ctxMenu && (
        <ParagraphContextMenu
          x={ctxMenu.x} y={ctxMenu.y}
          hasNote={noteIndices.has(ctxMenu.paraIdx)}
          onAddNote={() => openNoteEditor(ctxMenu.paraIdx, ctxMenu.paraText)}
          onEditNote={() => openNoteEditor(ctxMenu.paraIdx, ctxMenu.paraText)}
          onDeleteNote={() => {
            const n = getNoteForPara(ctxMenu.paraIdx);
            if (n && window.confirm(t('notes.confirm_delete'))) {
              deleteNote(n.id);
              onNoteDeleted?.(n.id);
            }
          }}
          onClose={() => setCtxMenu(null)}
          t={t}
        />
      )}

      {/* Note editor panel */}
      {noteEditor && (
        <NoteEditor
          note={noteEditor.note}
          paragraphPreview={noteEditor.paraText}
          textId={text.id}
          textTitle={text.title}
          paragraphIndex={noteEditor.paraIdx}
          onSave={handleNoteSave}
          onClose={() => setNoteEditor(null)}
          onDelete={handleNoteDelete}
          t={t}
        />
      )}
    </div>
  );
}
