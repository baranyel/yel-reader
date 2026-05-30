import { useState, useCallback, createContext, useContext } from 'react';

// ---- Icons ------------------------------------------------------------------
export function Icon({ name, size = 20, stroke = 1.7, style }) {
  const p = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: stroke,
    strokeLinecap: 'round', strokeLinejoin: 'round', style,
  };
  switch (name) {
    case 'library': return <svg {...p}><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H8a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5.5A1.5 1.5 0 0 1 4 18.5z"/><path d="M9 5a1 1 0 0 1 1-1h2.5A1.5 1.5 0 0 1 14 5.5v13a1.5 1.5 0 0 1-1.5 1.5H10a1 1 0 0 1-1-1z"/><path d="m15 5.6 2.4-.64a1.5 1.5 0 0 1 1.84 1.06l3 11.2"/></svg>;
    case 'plus': return <svg {...p}><path d="M12 5v14M5 12h14"/></svg>;
    case 'words': return <svg {...p}><path d="M4 6.5C4 5.7 4.7 5 5.5 5H18a2 2 0 0 1 2 2v11.5a.5.5 0 0 1-.5.5H6a2 2 0 0 0-2 2z"/><path d="M8 9.5h7M8 13h5"/></svg>;
    case 'search': return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>;
    case 'trash': return <svg {...p}><path d="M4 7h16M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7m2 0v12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V7"/><path d="M10 11v5M14 11v5"/></svg>;
    case 'x': return <svg {...p}><path d="M6 6l12 12M18 6 6 18"/></svg>;
    case 'sun': return <svg {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>;
    case 'moon': return <svg {...p}><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5"/></svg>;
    case 'chevronLeft': return <svg {...p}><path d="m14 6-6 6 6 6"/></svg>;
    case 'chevronRight': return <svg {...p}><path d="m9 6 6 6-6 6"/></svg>;
    case 'arrowLeft': return <svg {...p}><path d="M19 12H5M11 6l-6 6 6 6"/></svg>;
    case 'check': return <svg {...p}><path d="M5 12.5 10 17l9-10"/></svg>;
    case 'bookmark': return <svg {...p}><path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z"/></svg>;
    case 'sparkle': return <svg {...p}><path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z"/><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/></svg>;
    case 'clock': return <svg {...p}><circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 1.5"/></svg>;
    case 'doc': return <svg {...p}><path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v4h4"/></svg>;
    case 'book': return <svg {...p}><path d="M5 4.5C5 3.7 5.7 3 6.5 3H18a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6.5A1.5 1.5 0 0 0 5 20.5z"/><path d="M5 20.5A1.5 1.5 0 0 1 6.5 19H19"/></svg>;
    case 'feather': return <svg {...p}><path d="M20 4C10 4 6 10 6 16v2l10-10M6 18l4-4M9 9h5"/></svg>;
    case 'loader': return <svg {...p} style={{ animation: 'spin .8s linear infinite', ...style }}><circle cx="12" cy="12" r="9" strokeOpacity=".25"/><path d="M12 3a9 9 0 0 1 9 9" strokeLinecap="round"/></svg>;
    case 'settings': return <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
    case 'globe': return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 3c-2.5 4-2.5 14 0 18M12 3c2.5 4 2.5 14 0 18M3 12h18"/></svg>;
    case 'volume': return <svg {...p}><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>;
    case 'sort': return <svg {...p}><path d="M3 6h18M7 12h10M11 18h2"/></svg>;
    case 'edit': return <svg {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
    case 'zap': return <svg {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
    case 'chart': return <svg {...p}><rect x="2" y="16" width="4" height="6" rx="1"/><rect x="9" y="10" width="4" height="12" rx="1"/><rect x="16" y="4" width="4" height="18" rx="1"/></svg>;
    case 'download': return <svg {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
    case 'link': return <svg {...p}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
    case 'repeat': return <svg {...p}><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>;
    case 'pen': return <svg {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>;
    default: return null;
  }
}

// ---- Logo -------------------------------------------------------------------
export function Logo({ size = 30 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.32,
      background: 'var(--accent)', color: 'var(--accent-contrast)',
      display: 'grid', placeItems: 'center',
      boxShadow: 'var(--shadow-sm)', flexShrink: 0,
    }}>
      <Icon name="feather" size={size * 0.6} stroke={1.9} />
    </div>
  );
}

// ---- Button -----------------------------------------------------------------
export function Button({ children, variant = 'primary', size = 'md', icon, iconRight, onClick, type = 'button', disabled, style, title }) {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);
  const sizes = {
    sm: { padding: '7px 12px', fontSize: 13, gap: 6, iconSize: 16 },
    md: { padding: '10px 16px', fontSize: 14, gap: 8, iconSize: 18 },
    lg: { padding: '13px 22px', fontSize: 15.5, gap: 9, iconSize: 19 },
  }[size];
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: sizes.gap,
    padding: sizes.padding, fontSize: sizes.fontSize, fontWeight: 600, fontFamily: 'var(--font-ui)',
    borderRadius: 'var(--radius-sm)', border: '1px solid transparent', whiteSpace: 'nowrap',
    transition: 'transform .12s ease, background .18s ease, box-shadow .18s ease, border-color .18s ease',
    transform: press ? 'translateY(1px)' : 'none', opacity: disabled ? 0.5 : 1,
    pointerEvents: disabled ? 'none' : 'auto', letterSpacing: '.005em',
  };
  const variants = {
    primary: { background: hover ? 'color-mix(in srgb, var(--accent) 88%, #000)' : 'var(--accent)', color: 'var(--accent-contrast)', boxShadow: hover ? 'var(--shadow-md)' : 'var(--shadow-sm)' },
    secondary: { background: hover ? 'var(--surface-hover)' : 'var(--bg-elev)', color: 'var(--text)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' },
    ghost: { background: hover ? 'var(--surface-hover)' : 'transparent', color: 'var(--text-soft)' },
    danger: { background: hover ? 'color-mix(in srgb, #c0392b 12%, var(--bg-elev))' : 'transparent', color: hover ? '#c0392b' : 'var(--text-faint)', borderColor: hover ? 'color-mix(in srgb, #c0392b 30%, transparent)' : 'transparent' },
  };
  return (
    <button type={type} title={title} disabled={disabled} onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)} onMouseUp={() => setPress(false)}
      style={{ ...base, ...variants[variant], ...style }}>
      {icon && <Icon name={icon} size={sizes.iconSize} />}
      {children}
      {iconRight && <Icon name={iconRight} size={sizes.iconSize} />}
    </button>
  );
}

// ---- IconButton -------------------------------------------------------------
export function IconButton({ name, onClick, title, size = 18, danger, active, style }) {
  const [hover, setHover] = useState(false);
  return (
    <button title={title} onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 9, border: 'none',
        background: hover ? (danger ? 'color-mix(in srgb,#c0392b 13%,transparent)' : 'var(--surface-hover)') : (active ? 'var(--surface-hover)' : 'transparent'),
        color: danger && hover ? '#c0392b' : active ? 'var(--text)' : 'var(--text-faint)',
        transition: 'background .16s ease, color .16s ease', ...style,
      }}>
      <Icon name={name} size={size} />
    </button>
  );
}

// ---- Skeleton ---------------------------------------------------------------
export function Skel({ w = '100%', h = 14, r = 7, style }) {
  return <div className="skel" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

// ---- Two-step delete button -------------------------------------------------
export function DeleteButton({ onConfirm, label = 'item' }) {
  const [armed, setArmed] = useState(false);
  if (armed) {
    return (
      <button onClick={(e) => { e.stopPropagation(); onConfirm(); setArmed(false); }} title={'Confirm delete ' + label}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 10px', fontSize: 12.5, fontWeight: 600, borderRadius: 8, border: '1px solid color-mix(in srgb,#c0392b 35%,transparent)', background: 'color-mix(in srgb,#c0392b 12%,transparent)', color: '#c0392b' }}>
        <Icon name="trash" size={14} /> Sure?
      </button>
    );
  }
  return <IconButton name="trash" danger title={'Delete ' + label} onClick={(e) => { e.stopPropagation(); setArmed(true); }} />;
}

// ---- Page header ------------------------------------------------------------
export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 28, flexWrap: 'wrap' }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--text)' }}>{title}</h1>
        {subtitle && <p style={{ margin: '7px 0 0', fontSize: 14.5, color: 'var(--text-faint)', fontWeight: 450 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ---- Empty state ------------------------------------------------------------
export function EmptyState({ icon, title, body, action }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '70px 24px', animation: 'fadeUp .4s ease' }}>
      <div style={{ position: 'relative', width: 108, height: 108, marginBottom: 24 }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: 28, background: 'var(--accent-soft)', transform: 'rotate(-8deg)' }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: 26, background: 'var(--bg-elev)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', color: 'var(--accent)', boxShadow: 'var(--shadow-sm)' }}>
          <Icon name={icon} size={46} stroke={1.5} />
        </div>
      </div>
      <h3 style={{ margin: 0, fontSize: 19, fontWeight: 650, color: 'var(--text)' }}>{title}</h3>
      <p style={{ margin: '9px 0 22px', fontSize: 14.5, color: 'var(--text-faint)', maxWidth: 360, lineHeight: 1.6 }}>{body}</p>
      {action}
    </div>
  );
}

// ---- Toast ------------------------------------------------------------------
const ToastCtx = createContext(null);
export function useToast() { return useContext(ToastCtx); }

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const remove = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback((opts) => {
    const id = Math.random().toString(36).slice(2);
    const toast = typeof opts === 'string' ? { message: opts } : opts;
    setToasts((t) => [...t, { id, icon: 'check', ...toast }]);
    setTimeout(() => remove(id), toast.duration || 2800);
  }, [remove]);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div style={{ position: 'fixed', bottom: 26, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', gap: 10, zIndex: 9000, alignItems: 'center', pointerEvents: 'none' }}>
        {toasts.map((t) => (
          <div key={t.id} onClick={() => remove(t.id)} style={{
            display: 'flex', alignItems: 'center', gap: 11, padding: '12px 16px 12px 13px',
            background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 12,
            boxShadow: 'var(--shadow-lg)', color: 'var(--text)', fontSize: 14, fontWeight: 500,
            animation: 'toastIn .3s cubic-bezier(.2,.9,.3,1)', pointerEvents: 'auto', cursor: 'pointer', maxWidth: 380,
          }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 26, height: 26, borderRadius: 7, background: t.tone === 'danger' ? 'color-mix(in srgb,#c0392b 14%,transparent)' : 'var(--accent-soft)', color: t.tone === 'danger' ? '#c0392b' : 'var(--accent)', flexShrink: 0 }}>
              <Icon name={t.icon} size={16} stroke={2.1} />
            </span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
