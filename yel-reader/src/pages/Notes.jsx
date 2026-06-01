import { useState, useMemo, useEffect } from 'react';
import { Icon, EmptyState, PageHeader } from '../components/ui.jsx';
import { relativeTime } from '../utils/storage.js';
import { getImage } from '../utils/imageStore.js';
import NoteEditor, { NOTE_COLORS, NOTE_IMPORTANCE } from '../components/NoteEditor.jsx';

// ---- Importance badge -------------------------------------------------------
function ImportanceBadge({ level }) {
  if (!level) return null;
  const imp = NOTE_IMPORTANCE.find((i) => i.id === level);
  if (!imp) return null;
  const colors = ['', '#f97316', '#ef4444', '#7c3aed'];
  const c = colors[level];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', fontSize: 11.5, fontWeight: 800,
      padding: '1px 7px', borderRadius: 99,
      color: c,
      background: `color-mix(in srgb, ${c} 14%, var(--bg-elev))`,
      border: `1px solid color-mix(in srgb, ${c} 35%, transparent)`,
    }}>
      {imp.label}
    </span>
  );
}

// ---- Full block renderer (expanded view) ------------------------------------
function BlockRenderer({ block, imageCache }) {
  if (block.type === 'text') {
    return (
      <p style={{ margin: '0 0 12px', fontSize: 14.5, lineHeight: 1.7, color: 'var(--text)', whiteSpace: 'pre-wrap', fontFamily: 'var(--reading-font)' }}>
        {block.content}
      </p>
    );
  }
  const url = imageCache[block.imageId];
  return (
    <div style={{ marginBottom: 14 }}>
      {url
        ? <img src={url} alt={block.caption || ''} style={{ width: '100%', maxHeight: 420, objectFit: 'contain', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: '#000', display: 'block' }} />
        : <div style={{ height: 60, display: 'grid', placeItems: 'center', background: 'var(--bg-sunk)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}><Icon name="loader" size={18} /></div>}
      {block.caption && (
        <p style={{ margin: '5px 0 0', fontSize: 12.5, color: 'var(--text-faint)', fontStyle: 'italic', textAlign: 'center' }}>{block.caption}</p>
      )}
    </div>
  );
}

// ---- Note card --------------------------------------------------------------
function NoteCard({ note, onOpenText, onDelete, onEdit, t }) {
  const [expanded, setExpanded] = useState(false);
  const [imageCache, setImageCache] = useState({});

  const colorObj = NOTE_COLORS.find((c) => c.id === note.color) || null;
  const textBlock = note.blocks.find((b) => b.type === 'text' && b.content.trim());
  const imgCount  = note.blocks.filter((b) => b.type === 'image').length;

  // Load images when first expanded
  useEffect(() => {
    if (!expanded) return;
    const load = async () => {
      const cache = {};
      for (const b of note.blocks) {
        if (b.type === 'image' && b.imageId && !imageCache[b.imageId]) {
          cache[b.imageId] = await getImage(b.imageId);
        }
      }
      if (Object.keys(cache).length) setImageCache((prev) => ({ ...prev, ...cache }));
    };
    load();
  }, [expanded]);

  const borderLeft = colorObj ? `4px solid ${colorObj.dot}` : '4px solid transparent';

  return (
    <div style={{
      background: expanded && colorObj
        ? `color-mix(in srgb, ${colorObj.dot} 10%, var(--bg-elev))`
        : 'var(--bg-elev)',
      border: '1px solid var(--border)',
      borderLeft,
      borderRadius: 'var(--radius)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
      transition: 'background .2s',
    }}>
      {/* ---- Collapsed header (always visible) ---- */}
      <div onClick={() => setExpanded((v) => !v)} style={{ padding: '14px 16px', cursor: 'pointer' }}>
        {/* Top row: source + date + importance */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7, fontSize: 12, color: 'var(--text-faint)', fontWeight: 600 }}>
          <Icon name="library" size={12} />
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {note.textTitle}
          </span>
          <ImportanceBadge level={note.importance} />
          <span style={{ flexShrink: 0 }}>{relativeTime(note.updatedAt)}</span>
          <Icon name={expanded ? 'chevronLeft' : 'chevronRight'} size={14} style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(-90deg)', transition: 'transform .18s' }} />
        </div>

        {/* Paragraph quote */}
        {note.paragraphPreview && (
          <div style={{
            fontSize: 12.5, fontFamily: 'var(--reading-font)', fontStyle: 'italic',
            color: 'var(--text-soft)', lineHeight: 1.5,
            borderLeft: '3px solid var(--accent)', paddingLeft: 8, marginBottom: 8,
            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: expanded ? 99 : 2, WebkitBoxOrient: 'vertical',
          }}>
            {note.paragraphPreview}
          </div>
        )}

        {/* Collapsed preview */}
        {!expanded && textBlock && (
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
            {textBlock.content}
          </p>
        )}

        {/* Badges (collapsed only) */}
        {!expanded && (
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {imgCount > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 600, color: 'var(--text-faint)', background: 'var(--bg-sunk)', border: '1px solid var(--border)', borderRadius: 99, padding: '1px 8px' }}>
                <Icon name="image" size={11} /> {imgCount}
              </span>
            )}
            <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-faint)', background: 'var(--bg-sunk)', border: '1px solid var(--border)', borderRadius: 99, padding: '1px 8px' }}>
              {note.blocks.length} blok
            </span>
          </div>
        )}
      </div>

      {/* ---- Expanded body ---- */}
      {expanded && (
        <div style={{ padding: '0 16px 4px', animation: 'fadeUp .18s ease' }}>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginBottom: 4 }}>
            {note.blocks.map((block) => (
              <BlockRenderer key={block.id} block={block} imageCache={imageCache} />
            ))}
          </div>
        </div>
      )}

      {/* ---- Action bar ---- */}
      <div onClick={(e) => e.stopPropagation()}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderTop: '1px solid var(--border)', background: 'color-mix(in srgb,var(--bg-sunk) 60%,transparent)' }}>
        <button onClick={() => onDelete(note.id)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 500, color: 'var(--text-faint)', background: 'transparent', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#c0392b'; e.currentTarget.style.background = 'color-mix(in srgb,#c0392b 10%,transparent)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.background = 'transparent'; }}>
          <Icon name="trash" size={13} /> Sil
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={() => onOpenText(note.textId)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 500, color: 'var(--text-faint)', background: 'transparent', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--surface-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.background = 'transparent'; }}>
          <Icon name="library" size={13} /> {t('notes.open_text')}
        </button>
        <button onClick={() => onEdit(note)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-soft)', border: '1px solid color-mix(in srgb,var(--accent) 30%,transparent)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer' }}>
          <Icon name="pen" size={13} /> {t('ctxMenu.edit_note')}
        </button>
      </div>
    </div>
  );
}

// ---- Page -------------------------------------------------------------------
export default function Notes({ notes, onOpenText, onDeleteNote, onNoteSaved, t }) {
  const [query, setQuery] = useState('');
  const [editingNote, setEditingNote] = useState(null);

  const noteList = useMemo(() => {
    const all = Object.values(notes || {}).sort((a, b) => {
      // Sort by importance desc, then by date desc
      const ai = a.importance || 0, bi = b.importance || 0;
      if (bi !== ai) return bi - ai;
      return b.updatedAt - a.updatedAt;
    });
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {noteList.map((note) => (
            <NoteCard key={note.id} note={note}
              onOpenText={(id) => onOpenText(id)}
              onDelete={(id) => { if (window.confirm(t('notes.confirm_delete'))) onDeleteNote(id); }}
              onEdit={(n) => setEditingNote(n)}
              t={t} />
          ))}
        </div>
      )}

      {/* Inline NoteEditor */}
      {editingNote && (
        <NoteEditor
          note={editingNote}
          paragraphPreview={editingNote.paragraphPreview}
          textId={editingNote.textId}
          textTitle={editingNote.textTitle}
          paragraphIndex={editingNote.paragraphIndex}
          onSave={(updated) => { onNoteSaved(updated); setEditingNote(null); }}
          onClose={() => setEditingNote(null)}
          onDelete={() => { onDeleteNote(editingNote.id); setEditingNote(null); }}
          t={t}
        />
      )}
    </div>
  );
}
