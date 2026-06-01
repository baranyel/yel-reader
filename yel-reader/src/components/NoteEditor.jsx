import { useState, useEffect, useRef, useCallback } from 'react';
import { Icon, Button } from './ui.jsx';
import { saveImage, getImage, deleteImage } from '../utils/imageStore.js';
import { uid } from '../utils/storage.js';

// ---- Constants --------------------------------------------------------------
export const NOTE_COLORS = [
  { id: 'red',    bg: '#fee2e2', border: '#fca5a5', dot: '#ef4444' },
  { id: 'orange', bg: '#ffedd5', border: '#fdba74', dot: '#f97316' },
  { id: 'yellow', bg: '#fef9c3', border: '#fde047', dot: '#eab308' },
  { id: 'green',  bg: '#dcfce7', border: '#86efac', dot: '#22c55e' },
  { id: 'blue',   bg: '#dbeafe', border: '#93c5fd', dot: '#3b82f6' },
  { id: 'purple', bg: '#f3e8ff', border: '#d8b4fe', dot: '#a855f7' },
];

export const NOTE_IMPORTANCE = [
  { id: null,  label: '—',  title: 'Normal' },
  { id: 1,     label: '!',  title: 'Önemli' },
  { id: 2,     label: '!!', title: 'Çok önemli' },
  { id: 3,     label: '!!!',title: 'Kritik' },
];

export function getNoteColor(colorId) {
  return NOTE_COLORS.find((c) => c.id === colorId) || null;
}

// ---- Block components -------------------------------------------------------
function TextBlock({ block, onChange, onDelete, onAddTextAfter, t, fileInputRef, setPendingInsert, blockIndex }) {
  const taRef = useRef(null);
  useEffect(() => {
    if (taRef.current) { taRef.current.style.height = 'auto'; taRef.current.style.height = taRef.current.scrollHeight + 'px'; }
  }, [block.content]);

  return (
    <div style={{ position: 'relative', marginBottom: 4 }}>
      <textarea ref={taRef} value={block.content}
        onChange={(e) => onChange(block.id, e.target.value)}
        placeholder={t('noteEditor.text_ph')} rows={3}
        style={{ width: '100%', resize: 'none', overflow: 'hidden', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-sunk)', padding: '10px 40px 10px 12px', fontSize: 14.5, lineHeight: 1.65, color: 'var(--text)', fontFamily: 'var(--reading-font)', outline: 'none', transition: 'border-color .15s' }}
        onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
        onBlur={(e) => e.target.style.borderColor = 'var(--border)'} />
      <button onClick={() => onDelete(block.id)} title="Delete"
        style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--text-faint)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'color-mix(in srgb,#c0392b 12%,transparent)'; e.currentTarget.style.color = '#c0392b'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-faint)'; }}>
        <Icon name="x" size={13} />
      </button>
      <InsertStrip onAddText={onAddTextAfter} onAddImage={() => { setPendingInsert(blockIndex); fileInputRef.current?.click(); }} t={t} />
    </div>
  );
}

function ImageBlock({ block, imageUrl, onCaptionChange, onDelete, onAddTextAfter, t, fileInputRef, setPendingInsert, blockIndex }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1.5px solid var(--border)', background: 'var(--bg-sunk)' }}>
        {imageUrl
          ? <img src={imageUrl} alt="" style={{ width: '100%', maxHeight: 360, objectFit: 'contain', display: 'block', background: '#000' }} />
          : <div style={{ height: 80, display: 'grid', placeItems: 'center', color: 'var(--text-faint)' }}><Icon name="loader" size={20} /></div>}
        <button onClick={() => onDelete(block.id, block.imageId)}
          style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 7, border: 'none', background: 'rgba(0,0,0,.55)', color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
          <Icon name="x" size={14} />
        </button>
      </div>
      <input value={block.caption || ''} onChange={(e) => onCaptionChange(block.id, e.target.value)}
        placeholder={t('noteEditor.caption_ph')}
        style={{ width: '100%', border: '1.5px solid var(--border)', borderTop: 'none', borderRadius: '0 0 var(--radius-sm) var(--radius-sm)', background: 'var(--bg-sunk)', padding: '7px 12px', fontSize: 13, color: 'var(--text-faint)', outline: 'none', fontStyle: 'italic', transition: 'border-color .15s' }}
        onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
        onBlur={(e) => e.target.style.borderColor = 'var(--border)'} />
      <InsertStrip onAddText={onAddTextAfter} onAddImage={() => { setPendingInsert(blockIndex); fileInputRef.current?.click(); }} t={t} />
    </div>
  );
}

function InsertStrip({ onAddText, onAddImage, t }) {
  const [hover, setHover] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '4px 0 8px', opacity: hover ? 1 : 0.3, transition: 'opacity .15s' }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      <button onClick={onAddText} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 600, color: 'var(--text-faint)', background: 'var(--bg-sunk)', border: '1px solid var(--border)', borderRadius: 99, padding: '3px 9px', cursor: 'pointer' }}>
        <Icon name="plus" size={12} /> {t('noteEditor.add_text')}
      </button>
      <button onClick={onAddImage} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 600, color: 'var(--text-faint)', background: 'var(--bg-sunk)', border: '1px solid var(--border)', borderRadius: 99, padding: '3px 9px', cursor: 'pointer' }}>
        <Icon name="image" size={12} /> {t('noteEditor.add_image')}
      </button>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

// ---- Main -------------------------------------------------------------------
export default function NoteEditor({ note, paragraphPreview, textId, textTitle, paragraphIndex, onSave, onClose, onDelete, t }) {
  const isNew = !note;
  const [blocks, setBlocks] = useState(() =>
    note?.blocks?.length ? note.blocks : [{ id: uid(), type: 'text', content: '' }]
  );
  const [imageUrls, setImageUrls] = useState({});
  const [pendingInsert, setPendingInsert] = useState(null);
  const [color, setColor] = useState(note?.color || null);
  const [importance, setImportance] = useState(note?.importance ?? null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      const urls = {};
      for (const b of blocks) {
        if (b.type === 'image' && b.imageId) urls[b.imageId] = await getImage(b.imageId);
      }
      setImageUrls(urls);
    };
    load();
  }, []);

  const handleTextChange = useCallback((id, content) => {
    setBlocks((prev) => prev.map((b) => b.id === id ? { ...b, content } : b));
  }, []);

  const handleCaptionChange = useCallback((id, caption) => {
    setBlocks((prev) => prev.map((b) => b.id === id ? { ...b, caption } : b));
  }, []);

  const handleDeleteBlock = useCallback(async (id, imageId) => {
    if (imageId) await deleteImage(imageId).catch(() => {});
    setBlocks((prev) => {
      const next = prev.filter((b) => b.id !== id);
      return next.length ? next : [{ id: uid(), type: 'text', content: '' }];
    });
  }, []);

  const insertBlock = useCallback((afterIndex, newBlock, extraBlock) => {
    setBlocks((prev) => {
      const next = [...prev];
      const at = afterIndex === null ? next.length : afterIndex + 1;
      next.splice(at, 0, newBlock);
      if (extraBlock) next.splice(at + 1, 0, extraBlock);
      return next;
    });
  }, []);

  const addTextAfter = useCallback((afterIndex) => {
    insertBlock(afterIndex, { id: uid(), type: 'text', content: '' });
  }, [insertBlock]);

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      const imageId = 'img-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      await saveImage(imageId, dataUrl);
      setImageUrls((prev) => ({ ...prev, [imageId]: dataUrl }));
      const imgBlock = { id: uid(), type: 'image', imageId, caption: '' };
      const textBlock = { id: uid(), type: 'text', content: '' };
      insertBlock(pendingInsert, imgBlock, textBlock);
      setPendingInsert(null);
    };
    reader.readAsDataURL(file);
  }, [pendingInsert, insertBlock]);

  const handleSave = () => {
    const cleanBlocks = blocks.filter((b) => b.type === 'image' || b.content.trim());
    if (!cleanBlocks.length) return;
    onSave({
      id: note?.id || 'note-' + uid(),
      textId, textTitle, paragraphIndex,
      paragraphPreview: paragraphPreview?.slice(0, 160) || '',
      blocks: cleanBlocks,
      color: color || null,
      importance: importance ?? null,
      createdAt: note?.createdAt || Date.now(),
      updatedAt: Date.now(),
    });
  };

  const handleDelete = () => { if (window.confirm(t('notes.confirm_delete'))) onDelete(); };

  const colorObj = getNoteColor(color);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(2px)' }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 9001,
        width: 'min(540px, 100vw)',
        background: 'var(--bg-elev)', borderLeft: '1px solid var(--border)',
        boxShadow: '-8px 0 40px rgba(0,0,0,.15)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight .22s cubic-bezier(.2,.9,.3,1)',
      }}>
        {/* Colored top stripe */}
        {colorObj && <div style={{ height: 4, background: colorObj.dot, flexShrink: 0 }} />}

        {/* Header */}
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
              {isNew ? t('noteEditor.title_new') : t('noteEditor.title_edit')}
            </span>
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'transparent', color: 'var(--text-faint)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
              <Icon name="x" size={16} />
            </button>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-faint)', fontWeight: 500, marginBottom: 4 }}>
            {t('noteEditor.para_preview')} · {textTitle}
          </div>
          <div style={{ fontSize: 13, fontFamily: 'var(--reading-font)', fontStyle: 'italic', color: 'var(--text-soft)', lineHeight: 1.5, borderLeft: '3px solid var(--accent)', paddingLeft: 10, maxHeight: 56, overflow: 'hidden' }}>
            {paragraphPreview?.slice(0, 180)}{paragraphPreview?.length > 180 ? '…' : ''}
          </div>
        </div>

        {/* Color + Importance bar */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Color */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={() => setColor(null)} title="Renk yok"
              style={{ width: 20, height: 20, borderRadius: 99, border: color === null ? '2px solid var(--accent)' : '2px solid var(--border)', background: 'var(--bg-sunk)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
              <Icon name="x" size={10} style={{ color: 'var(--text-faint)' }} />
            </button>
            {NOTE_COLORS.map((c) => (
              <button key={c.id} onClick={() => setColor(c.id)} title={c.id}
                style={{ width: 20, height: 20, borderRadius: 99, border: color === c.id ? `2.5px solid ${c.dot}` : '2px solid transparent', background: c.dot, cursor: 'pointer', boxShadow: color === c.id ? `0 0 0 2px var(--bg-elev), 0 0 0 4px ${c.dot}` : 'none', transition: 'box-shadow .12s' }} />
            ))}
          </div>
          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
          {/* Importance */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {NOTE_IMPORTANCE.map((imp) => (
              <button key={String(imp.id)} onClick={() => setImportance(imp.id)} title={imp.title}
                style={{ minWidth: 30, padding: '3px 8px', fontSize: 12, fontWeight: 700, borderRadius: 6, border: '1.5px solid', cursor: 'pointer', transition: 'all .12s',
                  borderColor: importance === imp.id ? 'var(--accent)' : 'var(--border)',
                  background: importance === imp.id ? 'var(--accent-soft)' : 'transparent',
                  color: importance === imp.id ? 'var(--accent)' : 'var(--text-faint)',
                }}>
                {imp.label}
              </button>
            ))}
          </div>
        </div>

        {/* Blocks */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {blocks.map((block, idx) =>
            block.type === 'text' ? (
              <TextBlock key={block.id} block={block} onChange={handleTextChange}
                onDelete={(id) => handleDeleteBlock(id, null)}
                onAddTextAfter={() => addTextAfter(idx)}
                t={t} fileInputRef={fileInputRef} setPendingInsert={setPendingInsert} blockIndex={idx} />
            ) : (
              <ImageBlock key={block.id} block={block} imageUrl={imageUrls[block.imageId]}
                onCaptionChange={handleCaptionChange}
                onDelete={(id, imgId) => handleDeleteBlock(id, imgId)}
                onAddTextAfter={() => addTextAfter(idx)}
                t={t} fileInputRef={fileInputRef} setPendingInsert={setPendingInsert} blockIndex={idx} />
            )
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={() => addTextAfter(null)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: 'var(--text-faint)', background: 'var(--bg-sunk)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '7px 14px', cursor: 'pointer', transition: 'all .13s' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
              <Icon name="plus" size={14} /> {t('noteEditor.add_text')}
            </button>
            <button onClick={() => { setPendingInsert(null); fileInputRef.current?.click(); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: 'var(--text-faint)', background: 'var(--bg-sunk)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '7px 14px', cursor: 'pointer', transition: 'all .13s' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
              <Icon name="image" size={14} /> {t('noteEditor.add_image')}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, flexShrink: 0 }}>
          {!isNew && (
            <button onClick={handleDelete} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 500, color: '#c0392b', background: 'color-mix(in srgb,#c0392b 10%,transparent)', border: '1px solid color-mix(in srgb,#c0392b 30%,transparent)', borderRadius: 'var(--radius-sm)', padding: '9px 14px', cursor: 'pointer' }}>
              <Icon name="trash" size={15} /> {t('noteEditor.delete')}
            </button>
          )}
          <div style={{ flex: 1 }} />
          <Button variant="ghost" onClick={onClose}>{t('noteEditor.cancel')}</Button>
          <Button variant="primary" icon="check" onClick={handleSave}>{t('noteEditor.save')}</Button>
        </div>
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
    </>
  );
}
