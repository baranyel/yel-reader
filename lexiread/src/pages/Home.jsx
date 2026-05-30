import { useState, useMemo } from 'react';
import { Icon, Button, Skel, DeleteButton, PageHeader, EmptyState, IconButton } from '../components/ui.jsx';
import { preview, wordCount, relativeTime, readingTime } from '../utils/storage.js';

function TextCard({ text, onOpen, onDelete, onEdit, index }) {
  const [hover, setHover] = useState(false);
  const wc = wordCount(text.body);
  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative', display: 'flex', flexDirection: 'column', padding: 22,
        background: 'var(--bg-elev)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', cursor: 'pointer', minHeight: 188,
        boxShadow: hover ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transform: hover ? 'translateY(-3px)' : 'none',
        transition: 'transform .2s ease, box-shadow .2s ease, border-color .2s ease',
        borderColor: hover ? 'var(--border-strong)' : 'var(--border)',
        animation: `fadeUp .4s ease both`,
        animationDelay: `${index * 55}ms`,
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', flexShrink: 0 }}>
          <Icon name="doc" size={17} />
        </span>
        <div style={{ flex: 1, minWidth: 0, opacity: hover ? 0 : 1, transition: 'opacity .15s' }}>
          <span style={{ fontSize: 12, color: 'var(--text-faint)', fontWeight: 500 }}>{relativeTime(text.savedAt)}</span>
        </div>
        {text.language && (
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', background: 'var(--bg-sunk)', border: '1px solid var(--border)', padding: '2px 7px', borderRadius: 99, letterSpacing: '.03em', textTransform: 'uppercase', opacity: hover ? 0 : 1, transition: 'opacity .15s' }}>
            {text.language}
          </span>
        )}
        <div style={{ position: 'absolute', top: 17, right: 14, opacity: hover ? 1 : 0, transition: 'opacity .15s', display: 'flex', gap: 2 }}>
          <IconButton name="edit" size={16} title="Edit" onClick={(e) => { e.stopPropagation(); onEdit(); }} />
          <DeleteButton onConfirm={onDelete} label="text" />
        </div>
      </div>
      <h3 style={{ margin: '0 0 8px', fontSize: 17.5, fontWeight: 650, letterSpacing: '-.01em', color: 'var(--text)', lineHeight: 1.3 }}>
        {text.title}
      </h3>
      <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-soft)', lineHeight: 1.62, flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {preview(text.body, 120)}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)', fontSize: 12.5, color: 'var(--text-faint)', fontWeight: 500 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="book" size={14} /> {wc.toLocaleString()} words</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="clock" size={14} /> {readingTime(wc)}</span>
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div style={{ padding: 22, background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', minHeight: 188, display: 'flex', flexDirection: 'column' }}>
      <Skel w={30} h={30} r={8} style={{ marginBottom: 14 }} />
      <Skel w="72%" h={17} style={{ marginBottom: 12 }} />
      <Skel w="100%" h={11} style={{ marginBottom: 7 }} />
      <Skel w="92%" h={11} style={{ marginBottom: 7 }} />
      <Skel w="60%" h={11} />
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', gap: 12, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
        <Skel w={70} h={11} /><Skel w={70} h={11} />
      </div>
    </div>
  );
}

const SORTS = [
  { id: 'newest', labelKey: 'library.sort_newest' },
  { id: 'oldest', labelKey: 'library.sort_oldest' },
  { id: 'longest', labelKey: 'library.sort_longest' },
];

export default function Home({ texts, loading, onOpen, onDelete, onEdit, onNew, t }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [focus, setFocus] = useState(false);

  const processed = useMemo(() => {
    let list = [...texts];
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((text) =>
        text.title.toLowerCase().includes(q) || text.body.toLowerCase().includes(q)
      );
    }
    switch (sort) {
      case 'oldest': list.sort((a, b) => a.savedAt - b.savedAt); break;
      case 'longest': list.sort((a, b) => wordCount(b.body) - wordCount(a.body)); break;
      default: list.sort((a, b) => b.savedAt - a.savedAt);
    }
    return list;
  }, [texts, query, sort]);

  const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(264px, 1fr))', gap: 18 };

  const subtitle = loading
    ? t('library.loading')
    : query.trim()
      ? `${processed.length} / ${texts.length}`
      : t('library.subtitle', texts.length);

  return (
    <div>
      <PageHeader
        title={t('library.title')}
        subtitle={subtitle}
        action={<Button variant="primary" icon="plus" size="lg" onClick={onNew}>{t('library.new_text')}</Button>}
      />

      {/* Search + Sort bar */}
      {!loading && texts.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {/* Search input */}
          <div style={{
            flex: 1, minWidth: 180, display: 'flex', alignItems: 'center', gap: 8,
            padding: '0 12px', height: 40, background: 'var(--bg-elev)',
            border: '1px solid', borderColor: focus ? 'var(--accent)' : 'var(--border)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: focus ? '0 0 0 3px var(--accent-soft)' : 'var(--shadow-sm)',
            transition: 'border-color .16s, box-shadow .16s',
          }}>
            <Icon name="search" size={16} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocus(true)}
              onBlur={() => setFocus(false)}
              placeholder={t('library.search_ph')}
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--text)', fontFamily: 'var(--font-ui)' }}
            />
            {query && <IconButton name="x" size={14} title="Clear" onClick={() => setQuery('')} />}
          </div>

          {/* Sort segmented control */}
          <div style={{ display: 'flex', background: 'var(--bg-sunk)', borderRadius: 'var(--radius-sm)', padding: 3, gap: 2, border: '1px solid var(--border)', flexShrink: 0 }}>
            {SORTS.map((s) => {
              const active = sort === s.id;
              return (
                <button key={s.id} onClick={() => setSort(s.id)} style={{
                  padding: '5px 12px', fontSize: 13, fontWeight: active ? 600 : 450,
                  border: 'none', borderRadius: 6,
                  background: active ? 'var(--bg-elev)' : 'transparent',
                  color: active ? 'var(--text)' : 'var(--text-faint)',
                  boxShadow: active ? 'var(--shadow-sm)' : 'none',
                  transition: 'all .14s',
                }}>
                  {t(s.labelKey)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={grid}>{Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}</div>
      ) : texts.length === 0 ? (
        <EmptyState
          icon="library"
          title={t('library.empty_title')}
          body={t('library.empty_body')}
          action={<Button variant="primary" icon="plus" size="lg" onClick={onNew}>{t('library.add_first')}</Button>}
        />
      ) : processed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-faint)' }}>
          <Icon name="search" size={34} stroke={1.4} />
          <p style={{ marginTop: 14, fontSize: 15 }}>{t('library.no_match', query)}</p>
        </div>
      ) : (
        <div style={grid}>
          {processed.map((text, i) => (
            <TextCard key={text.id} text={text} index={i} onOpen={() => onOpen(text.id)} onDelete={() => onDelete(text.id)} onEdit={() => onEdit(text.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
