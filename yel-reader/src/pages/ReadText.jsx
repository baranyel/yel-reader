import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef, memo } from 'react';
import { Icon, Button } from '../components/ui.jsx';
import WordPopup from '../components/WordPopup.jsx';
import NoteEditor from '../components/NoteEditor.jsx';
import PhrasePopup from '../components/PhrasePopup.jsx';
import { ReadProgressRing } from '../components/ReadProgress.jsx';
import { wordCount, relativeTime, readingTime, saveProgress, getProgress } from '../utils/storage.js';
import { cleanWord, extractSentence, tokenize } from '../utils/text.js';
import { matchesSaved } from '../utils/lemma.js';
import { resolveResume } from '../utils/resume.js';
import { loadWordRanks, isRarerThan } from '../utils/wordRank.js';
import { HINT_LEVELS } from '../utils/wordRankCore.js';

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
// Should this word get a "probably new" hint? Only lower-case words (names are skipped),
// never saved or known ones.
function isHinted(text, base, hint) {
  return /^\p{Ll}/u.test(text) && base.length >= 3
    && !matchesSaved(hint.knownSet, base)
    && isRarerThan(base, hint.cap);
}

// One paragraph. Memoised: tapping a word or scrolling re-renders only what changed.
const Paragraph = memo(function Paragraph({ para, globalIdx, savedSet, activeKey, highlightMap, hasNote, hint, onWord, onContextMenu }) {
  const tokens = useMemo(() => tokenize(para), [para]);
  return (
    <p style={{ margin: '0 0 1.25em', textWrap: 'pretty', position: 'relative' }}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(e.clientX, e.clientY, globalIdx, para); }}>
      {hasNote && (
        <span style={{ position: 'absolute', left: -24, top: 5, color: 'var(--accent)', opacity: .8, cursor: 'pointer' }}
          onClick={(e) => { e.stopPropagation(); onContextMenu(e.clientX, e.clientY, globalIdx, para); }}>
          <Icon name="note" size={14} />
        </span>
      )}
      {tokens.map((tok, ti) => {
        if (!tok.word) return <span key={ti}>{tok.text}</span>;
        const base = cleanWord(tok.text);
        const key = globalIdx + ':' + ti;
        const saved = matchesSaved(savedSet, base);
        const hlColor = highlightMap?.[base];
        const cls = 'rw'
          + (saved ? ' saved' : hint && isHinted(tok.text, base, hint) ? ' hint' : '')
          + (activeKey === key ? ' active' : '')
          + (hlColor ? ` hl-${hlColor}` : '');
        return (
          <span key={key} className={cls} onClick={(e) => onWord(e.currentTarget, tok.text, key, para)}>
            {tok.text}
          </span>
        );
      })}
    </p>
  );
});

function ReadingBody({ paragraphs, pageStartIndex, savedSet, active, onWord, highlightMap, noteIndices, hint, onContextMenu }) {
  return (
    <div style={{ fontFamily: 'var(--reading-font)', fontSize: 'var(--reading-size)', lineHeight: 1.8, color: 'var(--text)', letterSpacing: '.002em' }}>
      {paragraphs.map((para, pi) => {
        const globalIdx = pageStartIndex + pi;
        return (
          <Paragraph key={globalIdx} para={para} globalIdx={globalIdx}
            savedSet={savedSet}
            activeKey={active && active.key.startsWith(globalIdx + ':') ? active.key : null}
            highlightMap={highlightMap} hasNote={noteIndices.has(globalIdx)} hint={hint}
            onWord={onWord} onContextMenu={onContextMenu} />
        );
      })}
    </div>
  );
}

// ---- Main component ---------------------------------------------------------
export default function ReadText({
  text, savedWords, onSaveWord, onBack, scrollRef, t, definitionOptions,
  highlights, onHighlight, onUpdateNote, onPageChange, notes, onNoteSaved, onNoteDeleted,
  knownSet, onMarkKnown, onUnmarkKnown, hintLevel,
}) {
  const [active, setActive] = useState(null);
  const [ctxMenu, setCtxMenu] = useState(null);
  const [noteEditor, setNoteEditor] = useState(null);
  const [showTapHint, setShowTapHint] = useState(() => {
    try { return !localStorage.getItem('tapHintSeen'); } catch { return false; }
  });
  const [ranksReady, setRanksReady] = useState(false);
  const bodyRef = useRef(null);

  const allParagraphs = useMemo(
    () => text.body.split(/\n+/).filter((p) => p.trim().length > 0),
    [text.body]
  );
  const pages = useMemo(() => paginateText(allParagraphs), [allParagraphs]);
  const totalPages = pages.length;
  const isPaginated = totalPages > 1;

  // Where to continue (computed once per text, when it is opened).
  const resume = useMemo(() => resolveResume(getProgress(text.id), totalPages), [text.id]); // eslint-disable-line
  const [currentPage, setCurrentPage] = useState(() => resume?.page ?? 0);
  const [resumeBanner, setResumeBanner] = useState(() => (resume ? Math.round(resume.overall * 100) : null));

  useEffect(() => {
    if (!resumeBanner) return;
    const id = setTimeout(() => setResumeBanner(null), 4000);
    return () => clearTimeout(id);
  }, [resumeBanner]);

  // Restore the scroll position once, right after the first paint of this text.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !resume) return;
    el.scrollTop = resume.scroll * Math.max(0, el.scrollHeight - el.clientHeight);
  }, []); // eslint-disable-line

  // Remember the position while reading (throttled; also when the tab is hidden or closed).
  const pageRef = useRef(currentPage);
  pageRef.current = currentPage;
  const lastScroll = useRef(resume?.scroll ?? 0);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let timer = null;
    const flush = () => {
      if (timer) { clearTimeout(timer); timer = null; }
      saveProgress(text.id, pageRef.current, lastScroll.current);
    };
    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight;
      lastScroll.current = max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0;
      if (!timer) timer = setTimeout(flush, 500);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pagehide', flush);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', flush);
      if (timer) flush();
    };
  }, [scrollRef, text.id]);

  useEffect(() => { setActive(null); setCtxMenu(null); }, [text?.id, currentPage]);

  // Load the frequency list only when "new word" hints are switched on.
  useEffect(() => {
    if (!hintLevel || hintLevel === 'off') return;
    let alive = true;
    loadWordRanks().then(() => { if (alive) setRanksReady(true); }).catch(() => {});
    return () => { alive = false; };
  }, [hintLevel]);

  const hint = useMemo(
    () => (ranksReady && HINT_LEVELS[hintLevel] ? { cap: HINT_LEVELS[hintLevel], knownSet } : null),
    [ranksReady, hintLevel, knownSet]
  );

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
    setShowTapHint(false);
    try { localStorage.setItem('tapHintSeen', '1'); } catch {}
  }, []);

  const goToPage = useCallback((idx) => {
    setCurrentPage(idx);
    lastScroll.current = 0;
    setActive(null);
    setCtxMenu(null);
    onPageChange?.();
    saveProgress(text.id, idx, 0);
  }, [onPageChange, text.id]);

  // ← / → turn pages (not while typing in a note).
  useEffect(() => {
    if (!isPaginated || noteEditor) return;
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.('input, textarea, [contenteditable]')) return;
      if (e.key === 'ArrowRight' && currentPage < totalPages - 1) goToPage(currentPage + 1);
      else if (e.key === 'ArrowLeft' && currentPage > 0) goToPage(currentPage - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPaginated, noteEditor, currentPage, totalPages, goToPage]);

  const handleContextMenu = useCallback((x, y, paraIdx, paraText) => {
    setActive(null);
    setCtxMenu({ x, y, paraIdx, paraText });
  }, []);

  const openNoteEditor = useCallback((paraIdx, paraText) => {
    setNoteEditor({ paraIdx, paraText, note: getNoteForPara(paraIdx) });
  }, [getNoteForPara]);

  const handleNoteSave = useCallback((note) => {
    onNoteSaved?.(note);
    setNoteEditor(null);
  }, [onNoteSaved]);

  const handleNoteDelete = useCallback(() => {
    const n = noteEditor?.note;
    if (n) onNoteDeleted?.(n.id);
    setNoteEditor(null);
  }, [noteEditor, onNoteDeleted]);

  const savedSet = useMemo(() => new Set(savedWords.map((w) => w.word)), [savedWords]);
  const noteMap = useMemo(
    () => Object.fromEntries(savedWords.filter((w) => w.note).map((w) => [w.word, w.note])),
    [savedWords]
  );
  const activeClean = active ? cleanWord(active.word) : null;
  const pageParas = pages[currentPage] || [];
  const totalWc = wordCount(text.body);

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
            <ReadProgressRing scrollRef={scrollRef} currentPage={currentPage} totalPages={totalPages}
              label={(pct) => t('readText.pct', pct)} />
          </div>
        </div>

        {/* Resume banner */}
        {resumeBanner && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 20, padding: '9px 14px', background: 'var(--accent-soft)', border: '1px solid color-mix(in srgb,var(--accent) 30%,transparent)', borderRadius: 'var(--radius)', fontSize: 13.5, color: 'var(--accent)', fontWeight: 500, animation: 'fadeUp .3s ease' }}>
            <Icon name="bookmark" size={16} />
            {t('readText.resume_pct', resumeBanner)}
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
        <div ref={bodyRef} style={{ paddingLeft: 28 }}>
          <ReadingBody
            paragraphs={pageParas}
            pageStartIndex={pageStartIndex}
            savedSet={savedSet}
            active={active}
            onWord={handleWord}
            highlightMap={highlights}
            noteIndices={noteIndices}
            hint={hint}
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
          onSave={(word, defData) => onSaveWord(word, text, defData, active.context)}
          onClose={() => setActive(null)}
          definitionOptions={definitionOptions} t={t}
          currentHighlight={highlights?.[activeClean] || null}
          onHighlight={onHighlight ? (color) => onHighlight(activeClean, color) : undefined}
          wordNote={noteMap[activeClean] || ''}
          onUpdateNote={onUpdateNote ? (note) => onUpdateNote(activeClean, note) : undefined}
          isKnown={knownSet?.has(activeClean) ?? false}
          onMarkKnown={onMarkKnown} onUnmarkKnown={onUnmarkKnown}
        />
      )}

      {/* Translate a selected phrase or sentence */}
      <PhrasePopup containerRef={bodyRef} from={text.language || 'en'} to={definitionOptions?.nativeLanguage || 'tr'} t={t} />

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
