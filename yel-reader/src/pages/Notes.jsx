import { useState, useMemo } from 'react';
import { Icon, Button, EmptyState, PageHeader } from '../components/ui.jsx';
import { relativeTime } from '../utils/storage.js';

function NoteCard({ note, onOpen, onDelete, t }) {
  const textBlock = note.blocks.find((b) => b.type === 'text' && b.content.trim());
  const imgCount = note.blocks.filter((b) => b.type === 'image').length;
  const [hover, setHover] = useState(false);

  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        background: 'var(--bg-elev)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '16px 18px',
        transition: 'box-shadow .15s, border-color .15s',
        boxShadow: hover ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        borderColor: hover ? 'color-mix(in srgb,var(--accent) 40%,var(--border))' : 'var(--border)',
      }}>
      {/* Source */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 12, color: 'var(--text-faint)', fontWeight: 600 }}>
        <Icon name="library" size={12} />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {note.textTitle}
        </span>
        <span style={{ flexShrink: 0 }}>{relativeTime(note.updatedAt)}</span>
      </div>

      {/* Paragraph preview */}
      {note.paragraphPreview && (
        <div style={{
          fontSize: 12.5, fontFamily: 'var(--reading-font)', fontStyle: 'italic',
          color: 'var(--text-soft)', lineHeight: 1.5,
          borderLeft: '3px solid var(--accent)', paddingLeft: 8,
          marginBottom: 10, overflow: 'hidden',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {note.paragraphPreview}
        </div>
      )}

      {/* Note preview */}
      {textBlock && (
        <p style={{
          margin: '0 0 10px', fontSize: 14, lineHeight: 1.6, color: 'var(--text)',
          overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
        }}>
          {textBlock.content}
        </p>
      )}

      {/* Badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {imgCount > 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 600, color: 'var(--text-faint)', background: 'var(--bg-sunk)', border: '1px solid var(--border)', borderRadius: 99, padding: '2px 8px' }}>
            <Icon name="image" size={11} /> {imgCount}
          </span>
        )}
        <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-faint)', background: 'var(--bg-sunk)', border: '1px solid var(--border)', borderRadius: 99, padding: '2px 8px' }}>
          {note.blocks.length} {note.blocks.length === 1 ? 'block' : 'blocks'}
        </span>
        <div style={{ flex: 1 }} />
        <button onClick={() => onDelete(note.id)} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'transparent', color: 'var(--text-faint)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#c0392b'; e.currentTarget.style.background = 'color-mix(in srgb,#c0392b 10%,transparent)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.background = 'transparent'; }}>
          <Icon name="trash" size={14} />
        </button>
        <Button variant="ghost" size="sm" icon="arrowRight" onClick={() => onOpen(note)}>
          {t('notes.open_text')}
        </Button>
      </div>
    </div>
  );
}

export default function Notes({ notes, onOpenText, onDeleteNote, t }) {
  const [query, setQuery] = useState('');

  const noteList = useMemo(() => {
    const all = Object.values(notes || {}).sort((a, b) => b.updatedAt - a.updatedAt);
    if (!query.trim()) return all;
    const q = query.toLowerCase();
    return all.filter((n) =>
      n.textTitle?.toLowerCase().includes(q) ||
      n.paragraphPreview?.toLowerCase().includes(q) ||
      n.blocks.some((b) => b.type === 'text' && b.content.toLowerCase().includes(q))
    );
  }, [notes, query]);

  const total = Object.keys(notes || {}).length;

  if (total === 0) {
    return (
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <PageHeader title={t('notes.title')} subtitle={t('notes.subtitle', 0)} />
        <EmptyState icon="bookmark" title={t('notes.empty_title')} body={t('notes.empty_body')} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <PageHeader title={t('notes.title')} subtitle={t('notes.subtitle', total)} />

      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, padding: '0 14px', height: 42, background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
        <Icon name="search" size={16} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
        <input value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder={t('notes.search_ph')}
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14.5, color: 'var(--text)', fontFamily: 'var(--font-ui)' }} />
        {query && <button onClick={() => setQuery('')} style={{ border: 'none', background: 'transparent', color: 'var(--text-faint)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><Icon name="x" size={14} /></button>}
      </div>

      {noteList.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 14, marginTop: 40 }}>{t('notes.no_match', query)}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {noteList.map((note) => (
            <NoteCard key={note.id} note={note}
              onOpen={(n) => onOpenText(n.textId, n.paragraphIndex)}
              onDelete={(id) => { if (window.confirm(t('notes.confirm_delete'))) onDeleteNote(id); }}
              t={t} />
          ))}
        </div>
      )}
    </div>
  );
}
