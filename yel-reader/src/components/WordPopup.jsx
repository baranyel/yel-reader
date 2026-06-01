import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { Icon, Button } from './ui.jsx';
import { lookupWord, cleanWord } from '../utils/dictionary.js';
import { getCefrLevel, CEFR_COLORS } from '../utils/cefrWords.js';

const HIGHLIGHT_COLORS = [
  { id: 'yellow', bg: 'rgba(250,204,21,0.7)', label: '●' },
  { id: 'green',  bg: 'rgba(34,197,94,0.65)',  label: '●' },
  { id: 'blue',   bg: 'rgba(59,130,246,0.65)',  label: '●' },
  { id: 'pink',   bg: 'rgba(236,72,153,0.65)',  label: '●' },
];

export default function WordPopup({
  targetEl, word, context, savedSet, onSave, onClose,
  definitionOptions, t,
  currentHighlight, onHighlight,       // highlight support (reading mode only)
  wordNote, onUpdateNote,              // note support (when saved)
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cefrLevel, setCefrLevel] = useState(null);
  const [chainWord, setChainWord] = useState(null);
  const [noteText, setNoteText] = useState(wordNote || '');
  const ref = useRef(null);
  const [pos, setPos] = useState({ top: -9999, left: -9999, caretLeft: 28, placement: 'below', ready: false });

  const activeWord = chainWord || word;
  const clean = cleanWord(activeWord);
  const isSaved = savedSet?.has(clean) ?? false;

  useEffect(() => { setChainWord(null); }, [word]);
  useEffect(() => { setNoteText(wordNote || ''); }, [wordNote, word]);

  useEffect(() => {
    if (!activeWord) return;
    setLoading(true);
    setData(null);
    setCefrLevel(null);
    const ctx = chainWord ? '' : context;
    lookupWord(activeWord, ctx, definitionOptions || {}).then((result) => {
      setData(result);
      setLoading(false);
    });
    getCefrLevel(clean).then(setCefrLevel).catch(() => {});
  }, [activeWord, definitionOptions?.definitionIn, definitionOptions?.nativeLanguage]);

  const reposition = useCallback(() => {
    if (!targetEl || !ref.current) return;
    const r = targetEl.getBoundingClientRect();
    const pw = ref.current.offsetWidth;
    const ph = ref.current.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let placement = 'below';
    let top = r.bottom + 11;
    if (top + ph > vh - 14) {
      const above = r.top - ph - 11;
      if (above > 14) { top = above; placement = 'above'; }
      else top = Math.max(14, Math.min(top, vh - ph - 14));
    }
    let left = r.left + r.width / 2 - pw / 2;
    left = Math.max(14, Math.min(left, vw - pw - 14));
    const caretLeft = Math.max(20, Math.min(r.left + r.width / 2 - left, pw - 20));
    setPos({ top, left, caretLeft, placement, ready: true });
  }, [targetEl]);

  useLayoutEffect(() => { reposition(); }, [reposition, data, loading]);
  useEffect(() => {
    const h = () => reposition();
    window.addEventListener('scroll', h, true);
    window.addEventListener('resize', h);
    return () => { window.removeEventListener('scroll', h, true); window.removeEventListener('resize', h); };
  }, [reposition]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target) && targetEl && !targetEl.contains(e.target)) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown, true);
    };
  }, [onClose, targetEl]);

  const playAudio = () => {
    if (!data?.audioUrl) return;
    new Audio(data.audioUrl).play().catch(() => {});
  };

  const handleNoteBlur = () => {
    if (onUpdateNote && noteText !== (wordNote || '')) onUpdateNote(noteText);
  };

  const caret = (
    <span style={{
      position: 'absolute', left: pos.caretLeft,
      [pos.placement === 'below' ? 'top' : 'bottom']: -6,
      width: 12, height: 12, background: 'var(--bg-elev)', transform: 'rotate(45deg)',
      borderLeft: pos.placement === 'below' ? '1px solid var(--border)' : 'none',
      borderTop: pos.placement === 'below' ? '1px solid var(--border)' : 'none',
      borderRight: pos.placement === 'above' ? '1px solid var(--border)' : 'none',
      borderBottom: pos.placement === 'above' ? '1px solid var(--border)' : 'none',
      marginLeft: -6,
    }} />
  );

  return (
    <div ref={ref} style={{
      position: 'fixed', top: pos.top, left: pos.left, zIndex: 8000,
      width: 340, maxWidth: 'calc(100vw - 28px)',
      background: 'var(--bg-elev)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)', padding: 18,
      opacity: pos.ready ? 1 : 0,
      animation: pos.ready ? 'popIn .18s cubic-bezier(.2,.9,.3,1)' : 'none',
    }}>
      {caret}

      {/* Chain back button */}
      {chainWord && (
        <button onClick={() => setChainWord(null)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 12, fontSize: 12.5, fontWeight: 500, color: 'var(--accent)', background: 'var(--accent-soft)', border: 'none', borderRadius: 99, padding: '4px 10px' }}>
          <Icon name="arrowLeft" size={13} /> {cleanWord(word)}
        </button>
      )}

      {/* Header: word + audio + pos + close */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--reading-font)', fontSize: 24, fontWeight: 600, color: 'var(--text)', letterSpacing: '-.01em' }}>
              {clean}
            </span>
            {data?.audioUrl && (
              <button onClick={playAudio} title={t ? t('popup.play_audio') : 'Pronounce'}
                style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--accent)', flexShrink: 0, transition: 'background .14s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-soft)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <Icon name="volume" size={15} stroke={2} />
              </button>
            )}
          </div>
          {data?.phonetic && (
            <div style={{ fontSize: 13, color: 'var(--text-faint)', marginTop: 3, fontFamily: "'Courier New', monospace" }}>
              {data.phonetic}
            </div>
          )}
          {data?.translation && (
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)', marginTop: 5, fontFamily: 'var(--reading-font)', letterSpacing: '-.01em' }}>
              {data.translation}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, paddingTop: 2 }}>
          {cefrLevel && (
            <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 99, color: CEFR_COLORS[cefrLevel], background: `color-mix(in srgb, ${CEFR_COLORS[cefrLevel]} 14%, var(--bg-elev))`, border: `1px solid color-mix(in srgb, ${CEFR_COLORS[cefrLevel]} 35%, transparent)`, letterSpacing: '.03em' }}>
              {cefrLevel}
            </span>
          )}
          {data && data.pos !== '—' && (
            <span style={{ fontSize: 11.5, fontWeight: 600, fontStyle: 'italic', color: 'var(--text-faint)', background: 'var(--bg-sunk)', border: '1px solid var(--border)', padding: '2px 9px', borderRadius: 99 }}>
              {data.pos}
            </span>
          )}
          <button onClick={onClose} title="Close"
            style={{ display: 'grid', placeItems: 'center', width: 26, height: 26, borderRadius: 7, border: 'none', background: 'transparent', color: 'var(--text-faint)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-faint)'; }}>
            <Icon name="x" size={15} />
          </button>
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-faint)', fontSize: 14 }}>
          <Icon name="loader" size={18} stroke={2} />
          {t ? t('popup.loading') : 'Looking up…'}
        </div>
      ) : data ? (
        <>
          <p style={{ margin: '12px 0 0', fontSize: 14.5, lineHeight: 1.6, color: 'var(--text)' }}>
            {data.definition}
          </p>

          {data.found && data.example && (
            <div style={{ marginTop: 13, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
              <p style={{ margin: 0, fontFamily: 'var(--reading-font)', fontStyle: 'italic', fontSize: 14.5, lineHeight: 1.6, color: 'var(--text-soft)' }}>
                "{data.example}"
              </p>
            </div>
          )}

          {data.synonyms?.length > 0 && (
            <ChipRow label={t ? t('popup.synonyms') : 'Synonyms'} chips={data.synonyms} onChip={setChainWord} accent />
          )}
          {data.antonyms?.length > 0 && (
            <ChipRow label={t ? t('popup.antonyms') : 'Antonyms'} chips={data.antonyms} onChip={setChainWord} danger />
          )}

          {/* Source badge */}
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {data.translatedWith === 'translated' && (
              <span style={{ fontSize: 12, color: 'var(--text-faint)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Icon name="globe" size={12} style={{ color: 'var(--accent)' }} />
                {t ? t('popup.via_lingva') : 'via Translate'}
                <span style={{ background: 'var(--accent-soft)', color: 'var(--accent)', padding: '1px 6px', borderRadius: 99, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>{data.lang}</span>
              </span>
            )}
            {data.source === 'anthropic' && !data.translatedWith && (
              <span style={{ fontSize: 12, color: 'var(--text-faint)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Icon name="sparkle" size={12} style={{ color: 'var(--accent)' }} />
                {t ? t('popup.via_ai') : 'via AI'}
              </span>
            )}
            {data.fallback && (
              <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>
                {t ? t('popup.fallback_note') : '(English — translate unavailable)'}
              </span>
            )}
          </div>
        </>
      ) : null}

      {/* Save button */}
      {!loading && (
        <div style={{ marginTop: 14 }}>
          {isSaved ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '9px 14px', borderRadius: 'var(--radius-sm)', width: '100%', justifyContent: 'center' }}>
              <Icon name="check" size={17} stroke={2.2} />
              {t ? t('popup.saved') : 'Saved to My Words'}
            </div>
          ) : (
            <Button variant="primary" icon="bookmark" onClick={() => onSave(clean, data)} style={{ width: '100%' }}>
              {t ? t('popup.save') : 'Save Word'}
            </Button>
          )}
        </div>
      )}

      {/* ---- Personal note (only for saved, non-chained words) ---- */}
      {!loading && isSaved && !chainWord && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
            <Icon name="pen" size={12} />
            {t ? t('popup.add_note') : 'Note'}
          </div>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onBlur={handleNoteBlur}
            placeholder={t ? t('popup.add_note') : 'Add a note…'}
            rows={2}
            style={{
              width: '100%', resize: 'none', border: '1px solid var(--border)', outline: 'none',
              borderRadius: 'var(--radius-sm)', background: 'var(--bg-sunk)',
              padding: '8px 10px', fontSize: 13, lineHeight: 1.55, color: 'var(--text)',
              fontFamily: 'var(--font-ui)', transition: 'border-color .15s',
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
            onBlurCapture={(e) => e.target.style.borderColor = 'var(--border)'}
          />
        </div>
      )}

      {/* ---- Highlight swatches (reading mode only) ---- */}
      {!loading && onHighlight && !chainWord && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.05em', flexShrink: 0 }}>
            {t ? t('popup.highlight') : 'Highlight'}
          </span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {HIGHLIGHT_COLORS.map((c) => {
              const active = currentHighlight === c.id;
              return (
                <button key={c.id} onClick={() => onHighlight(active ? null : c.id)}
                  title={c.id}
                  style={{
                    width: 22, height: 22, borderRadius: 99, border: 'none',
                    background: c.bg, cursor: 'pointer', flexShrink: 0,
                    boxShadow: active ? `0 0 0 2px var(--bg-elev), 0 0 0 3.5px ${c.bg}` : 'none',
                    transform: active ? 'scale(1.18)' : 'scale(1)',
                    transition: 'transform .14s, box-shadow .14s',
                  }} />
              );
            })}
            {currentHighlight && (
              <button onClick={() => onHighlight(null)}
                style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-faint)', background: 'transparent', border: 'none', padding: '2px 6px', borderRadius: 6, cursor: 'pointer' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-faint)'}>
                {t ? t('popup.hl_remove') : 'Remove'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ChipRow({ label, chips, onChip, accent, danger }) {
  return (
    <div style={{ marginTop: 11 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
        {label}
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
        {chips.map((word) => (
          <button key={word} onClick={() => onChip(word)} style={{
            fontSize: 12.5, padding: '3px 10px', borderRadius: 99,
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text-soft)', cursor: 'pointer', transition: 'all .13s',
          }}
          onMouseEnter={(e) => {
            if (danger) { e.currentTarget.style.background = 'color-mix(in srgb,#c0392b 10%,transparent)'; e.currentTarget.style.color = '#c0392b'; e.currentTarget.style.borderColor = 'color-mix(in srgb,#c0392b 35%,transparent)'; }
            else { e.currentTarget.style.background = 'var(--accent-soft)'; e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)'; }
          }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-soft)'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
            {word}
          </button>
        ))}
      </div>
    </div>
  );
}
