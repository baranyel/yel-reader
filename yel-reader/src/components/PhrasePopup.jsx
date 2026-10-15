import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Icon } from './ui.jsx';
import { translatePhrase } from '../utils/dictionary.js';

const MIN_WORDS = 2;
const MAX_CHARS = 400;

// Floating "Translate" chip that appears when the reader selects a phrase or sentence
// inside `containerRef`. Clicking it shows the translation in a small card.
export default function PhrasePopup({ containerRef, from = 'en', to = 'tr', t }) {
  const [sel, setSel] = useState(null);       // { text, rect }
  const [open, setOpen] = useState(false);
  const [state, setState] = useState({ status: 'idle', text: '' }); // idle | loading | done | error
  const cardRef = useRef(null);
  const requestId = useRef(0);
  const [cardPos, setCardPos] = useState(null);

  // Track the selection (debounced, so dragging handles on touch screens does not flicker).
  useEffect(() => {
    let timer;
    const read = () => {
      const s = window.getSelection();
      const container = containerRef.current;
      if (!s || s.isCollapsed || s.rangeCount === 0 || !container) return null;
      const range = s.getRangeAt(0);
      if (!container.contains(range.commonAncestorContainer)) return null;
      const text = s.toString().replace(/\s+/g, ' ').trim();
      const words = text.match(/\S+/g)?.length || 0;
      if (words < MIN_WORDS || text.length > MAX_CHARS) return null;
      const rects = range.getClientRects();
      const rect = rects.length ? rects[rects.length - 1] : range.getBoundingClientRect();
      return { text, rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom } };
    };
    const onChange = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const next = read();
        setSel((cur) => {
          if (!next) return null;
          if (cur && cur.text === next.text) return cur;
          requestId.current++;
          setOpen(false);
          setState({ status: 'idle', text: '' });
          return next;
        });
      }, 250);
    };
    document.addEventListener('selectionchange', onChange);
    return () => { clearTimeout(timer); document.removeEventListener('selectionchange', onChange); };
  }, [containerRef]);

  const translate = () => {
    if (!sel) return;
    setOpen(true);
    setState({ status: 'loading', text: '' });
    const id = ++requestId.current;
    const isCurrent = () => id === requestId.current;
    translatePhrase(sel.text, { from, to })
      .then((result) => { if (isCurrent()) setState({ status: result ? 'done' : 'error', text: result || '' }); })
      .catch(() => { if (isCurrent()) setState({ status: 'error', text: '' }); });
  };

  // Keep the card inside the viewport.
  useLayoutEffect(() => {
    if (!open || !sel || !cardRef.current) return;
    const w = cardRef.current.offsetWidth, h = cardRef.current.offsetHeight;
    const vw = window.innerWidth, vh = window.innerHeight;
    let top = sel.rect.bottom + 10;
    if (top + h > vh - 12) top = Math.max(12, sel.rect.top - h - 10);
    const left = Math.max(12, Math.min(sel.rect.left, vw - w - 12));
    setCardPos({ top, left });
  }, [open, sel, state]);

  if (!sel) return null;

  const chipTop = Math.min(window.innerHeight - 44, sel.rect.bottom + 8);
  const chipLeft = Math.max(8, Math.min(sel.rect.right - 8, window.innerWidth - 120));

  return (
    <>
      {!open && (
        <button
          // Keep the text selected while the chip is pressed.
          onMouseDown={(e) => e.preventDefault()}
          onClick={translate}
          style={{
            position: 'fixed', top: chipTop, left: chipLeft, zIndex: 8500,
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px',
            fontSize: 13, fontWeight: 600, borderRadius: 99, border: '1px solid var(--border)',
            background: 'var(--bg-elev)', color: 'var(--accent)', boxShadow: 'var(--shadow-md)',
            animation: 'popIn .14s ease',
          }}>
          <Icon name="globe" size={14} /> {t('phrase.translate')}
        </button>
      )}

      {open && (
        <div ref={cardRef} onMouseDown={(e) => e.preventDefault()} style={{
          position: 'fixed', top: cardPos?.top ?? -9999, left: cardPos?.left ?? -9999, zIndex: 8500,
          width: 360, maxWidth: 'calc(100vw - 24px)', padding: '14px 16px',
          background: 'var(--bg-elev)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)',
          opacity: cardPos ? 1 : 0, animation: cardPos ? 'popIn .16s ease' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <p style={{ flex: 1, margin: 0, fontSize: 15, lineHeight: 1.6, color: state.status === 'error' ? 'var(--text-faint)' : 'var(--text)' }}>
              {state.status === 'loading' && (<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-faint)' }}><Icon name="loader" size={16} stroke={2} /> {t('phrase.translating')}</span>)}
              {state.status === 'done' && state.text}
              {state.status === 'error' && t('phrase.failed')}
            </p>
            <button onClick={() => { setOpen(false); setSel(null); window.getSelection()?.removeAllRanges(); }}
              title={t('common.close')}
              style={{ display: 'grid', placeItems: 'center', width: 26, height: 26, borderRadius: 7, border: 'none', background: 'transparent', color: 'var(--text-faint)', flexShrink: 0 }}>
              <Icon name="x" size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
