import { useState, useEffect, useCallback, useMemo } from 'react';
import { Icon, Button, Skel } from '../components/ui.jsx';
import WordPopup from '../components/WordPopup.jsx';
import { wordCount, relativeTime, readingTime, saveProgress, getProgress } from '../utils/storage.js';
import { cleanWord, extractSentence } from '../utils/dictionary.js';

// ---- Pagination -------------------------------------------------------------
// Split paragraphs into pages: each page ~WORDS_PER_PAGE words, always breaks
// at paragraph boundaries. Short texts (≤ MIN_WORDS) stay on a single page.
const WORDS_PER_PAGE = 900;
const MIN_WORDS = 1600;

function paginateText(paragraphs) {
  const total = paragraphs.reduce((s, p) => s + (p.match(/\S+/g)?.length || 0), 0);
  if (total <= MIN_WORDS) return [paragraphs];

  const pages = [];
  let page = [], count = 0;
  for (const para of paragraphs) {
    const wc = para.match(/\S+/g)?.length || 0;
    // Start a new page when the current one is full — but never split the
    // current paragraph; always finish it first.
    if (count >= WORDS_PER_PAGE && page.length > 0) {
      pages.push(page);
      page = [];
      count = 0;
    }
    page.push(para);
    count += wc;
  }
  if (page.length) pages.push(page);
  return pages;
}

// ---- Reading body (single page of paragraphs) --------------------------------
function ReadingBody({ paragraphs, savedSet, activeKey, onWord, highlightMap }) {
  let counter = 0;
  return (
    <div style={{ fontFamily: 'var(--reading-font)', fontSize: 'var(--reading-size)', lineHeight: 1.8, color: 'var(--text)', letterSpacing: '.002em' }}>
      {paragraphs.map((para, pi) => {
        const tokens = para.match(/[A-Za-z']+|[^A-Za-z']+/g) || [];
        return (
          <p key={pi} style={{ margin: '0 0 1.25em', textWrap: 'pretty' }}>
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

// ---- Main component ----------------------------------------------------------
export default function ReadText({
  text, savedWords, onSaveWord, onBack, loading, progress, t, definitionOptions,
  highlights, onHighlight, onUpdateNote, onPageChange,
}) {
  const [active, setActive] = useState(null);

  // Build paragraphs + pages once (text body won't change mid-read)
  const allParagraphs = useMemo(
    () => text.body.split(/\n+/).filter((p) => p.trim().length > 0),
    [text.body]
  );
  const pages = useMemo(() => paginateText(allParagraphs), [allParagraphs]);
  const totalPages = pages.length;
  const isPaginated = totalPages > 1;

  // Restore saved page (clamp in case text was edited since last visit)
  const [currentPage, setCurrentPage] = useState(() => {
    const saved = getProgress(text.id);
    return saved ? Math.min(saved.page, totalPages - 1) : 0;
  });

  // Show "resuming from page N" banner when we auto-jump past page 1
  const [resumeBanner, setResumeBanner] = useState(() => {
    const saved = getProgress(text.id);
    return saved && saved.page > 0 ? saved.page + 1 : null; // 1-indexed for display
  });

  useEffect(() => {
    if (!resumeBanner) return;
    const id = setTimeout(() => setResumeBanner(null), 4000);
    return () => clearTimeout(id);
  }, [resumeBanner]);

  // Save progress whenever page changes
  useEffect(() => {
    if (isPaginated) saveProgress(text.id, currentPage);
  }, [text.id, currentPage, isPaginated]);

  // Close popup when page changes or text changes
  useEffect(() => { setActive(null); }, [text?.id, currentPage]);

  const handleWord = useCallback((el, tok, key, paragraphText) => {
    const context = extractSentence(paragraphText, tok);
    setActive((cur) => (cur && cur.key === key ? null : { el, word: tok, key, context }));
  }, []);

  const goToPage = useCallback((idx) => {
    setCurrentPage(idx);
    setActive(null);
    onPageChange?.(); // scroll container to top
  }, [onPageChange]);

  // Overall reading progress: completed pages + scroll within current page
  const overallPct = isPaginated
    ? Math.round(((currentPage + progress) / totalPages) * 100)
    : Math.round(progress * 100);

  const savedSet = new Set(savedWords.map((w) => w.word));
  const noteMap = Object.fromEntries(savedWords.filter(w => w.note).map(w => [w.word, w.note]));
  const activeClean = active ? cleanWord(active.word) : null;
  const pageParas = pages[currentPage] || [];
  const totalWc = wordCount(text.body);

  // ---- Loading skeleton -----------------------------------------------
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

        {/* ---- Top bar ---- */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 }}>
          <Button variant="ghost" icon="arrowLeft" size="sm" onClick={onBack}>{t('readText.back')}</Button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Page indicator (paginated only) */}
            {isPaginated && (
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-faint)', background: 'var(--bg-sunk)', border: '1px solid var(--border)', padding: '4px 12px', borderRadius: 99 }}>
                {t('readText.page_of', currentPage + 1, totalPages)}
              </span>
            )}

            {/* Overall progress circle */}
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

        {/* ---- Resume banner ---- */}
        {resumeBanner && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 9, marginBottom: 20,
            padding: '9px 14px', background: 'var(--accent-soft)',
            border: '1px solid color-mix(in srgb,var(--accent) 30%,transparent)',
            borderRadius: 'var(--radius)', fontSize: 13.5, color: 'var(--accent)', fontWeight: 500,
            animation: 'fadeUp .3s ease',
          }}>
            <Icon name="bookmark" size={16} />
            {t('readText.resume', resumeBanner)}
          </div>
        )}

        {/* ---- Article header ---- */}
        <header style={{ marginBottom: 30 }}>
          <h1 style={{ margin: 0, fontFamily: 'var(--reading-font)', fontSize: 38, fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1.15, color: 'var(--text)' }}>
            {text.title}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, fontSize: 13, color: 'var(--text-faint)', fontWeight: 500, flexWrap: 'wrap' }}>
            <span>{readingTime(totalWc)}</span>
            <span style={{ width: 3, height: 3, borderRadius: 99, background: 'var(--text-faint)' }} />
            <span>Saved {relativeTime(text.savedAt)}</span>
            {isPaginated && (
              <>
                <span style={{ width: 3, height: 3, borderRadius: 99, background: 'var(--text-faint)' }} />
                <span>{totalPages} pages</span>
              </>
            )}
          </div>
          <div style={{ marginTop: 18, display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--text-faint)', background: 'var(--bg-sunk)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 99 }}>
            <Icon name="sparkle" size={14} style={{ color: 'var(--accent)' }} />
            {t('readText.tap_hint')}
          </div>
        </header>

        {/* ---- Reading body ---- */}
        <ReadingBody
          paragraphs={pageParas}
          savedSet={savedSet}
          activeKey={active?.key}
          onWord={handleWord}
          highlightMap={highlights}
        />

        {/* ---- Page navigation ---- */}
        {isPaginated && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--border)',
          }}>
            <Button
              variant="secondary" icon="arrowLeft"
              disabled={currentPage === 0}
              onClick={() => goToPage(currentPage - 1)}>
              {t('readText.prev_page')}
            </Button>

            {/* Page dots (show up to 9) */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {totalPages <= 9 ? (
                Array.from({ length: totalPages }).map((_, i) => (
                  <button key={i} onClick={() => goToPage(i)} style={{
                    width: i === currentPage ? 20 : 8,
                    height: 8, borderRadius: 99, border: 'none',
                    background: i === currentPage ? 'var(--accent)' : 'var(--border)',
                    cursor: 'pointer', transition: 'all .18s ease', padding: 0,
                  }} />
                ))
              ) : (
                <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-faint)' }}>
                  {currentPage + 1} / {totalPages}
                </span>
              )}
            </div>

            <Button
              variant={currentPage === totalPages - 1 ? 'secondary' : 'primary'}
              iconRight="chevronRight"
              disabled={currentPage === totalPages - 1}
              onClick={() => goToPage(currentPage + 1)}>
              {currentPage === totalPages - 1 ? t('readText.finished') : t('readText.next_page')}
            </Button>
          </div>
        )}
      </div>

      {/* ---- Word popup ---- */}
      {active && (
        <WordPopup
          targetEl={active.el}
          word={active.word}
          context={active.context}
          savedSet={savedSet}
          onSave={(word, defData) => onSaveWord(word, text, defData)}
          onClose={() => setActive(null)}
          definitionOptions={definitionOptions}
          t={t}
          currentHighlight={highlights?.[activeClean] || null}
          onHighlight={onHighlight ? (color) => onHighlight(activeClean, color) : undefined}
          wordNote={noteMap[activeClean] || ''}
          onUpdateNote={onUpdateNote ? (note) => onUpdateNote(activeClean, note) : undefined}
        />
      )}
    </div>
  );
}
