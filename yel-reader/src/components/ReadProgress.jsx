import { useState, useEffect } from 'react';

// Scroll progress (0..1) of a scroll container. Kept in tiny components of its own so that
// scrolling re-renders only these, never the text being read.
function useScrollProgress(scrollRef) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollHeight - el.clientHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 1;
      setProgress(Math.round(p * 1000) / 1000);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [scrollRef]);
  return progress;
}

// Thin bar stuck to the top of the scroll area.
export function ReadProgressBar({ scrollRef }) {
  const progress = useScrollProgress(scrollRef);
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 30, height: 3 }}>
      <div style={{ height: '100%', width: Math.round(progress * 100) + '%', background: 'var(--accent)', transition: 'width .1s linear', borderRadius: '0 2px 2px 0' }} />
    </div>
  );
}

// Ring + percentage of the whole text (page position plus scroll within the page).
export function ReadProgressRing({ scrollRef, currentPage, totalPages, label }) {
  const progress = useScrollProgress(scrollRef);
  const overall = (currentPage + progress) / totalPages;
  const circumference = 2 * Math.PI * 15;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: 'var(--text-faint)' }}>
      <span style={{ position: 'relative', width: 22, height: 22 }}>
        <svg width="22" height="22" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="18" cy="18" r="15" fill="none" stroke="var(--border)" strokeWidth="4" />
          <circle cx="18" cy="18" r="15" fill="none" stroke="var(--accent)" strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - overall)}
            style={{ transition: 'stroke-dashoffset .12s linear' }} />
        </svg>
      </span>
      {label(Math.round(overall * 100))}
    </span>
  );
}
