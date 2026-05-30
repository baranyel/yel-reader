import { useState, useRef, useCallback } from 'react';
import { Button, Icon, IconButton, PageHeader } from '../components/ui.jsx';
import { wordCount, readingTime } from '../utils/storage.js';
import { TEXT_LANGUAGES } from '../utils/i18n.js';

// CORS proxies tried in order; first success wins.
// allorigins returns JSON {contents}, others return raw HTML.
const CORS_PROXIES = [
  { url: (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`, json: false },
  { url: (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`, json: true },
  { url: (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`, json: false },
];

async function fetchHtml(url) {
  for (const proxy of CORS_PROXIES) {
    try {
      const res = await fetch(proxy.url(url), { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const html = proxy.json ? (await res.json()).contents : await res.text();
      if (html && html.length > 200) return html;
    } catch {}
  }
  throw new Error('proxy_error');
}

async function fetchFromUrl(url) {
  const contents = await fetchHtml(url);
  if (!contents) throw new Error('empty');

  const parser = new DOMParser();
  const doc = parser.parseFromString(contents, 'text/html');

  // Strip noise
  ['script', 'style', 'nav', 'header', 'footer', 'aside', 'iframe', 'noscript', 'figure', 'figcaption'].forEach((tag) => {
    doc.querySelectorAll(tag).forEach((el) => el.remove());
  });

  const title = (
    doc.querySelector('h1')?.textContent ||
    doc.querySelector('title')?.textContent ||
    ''
  ).trim().replace(/\s+/g, ' ').slice(0, 120);

  const main = doc.querySelector('article, main, [role="main"]') || doc.body;
  const paras = [...main.querySelectorAll('p')]
    .map((p) => p.textContent.trim())
    .filter((t) => t.length > 40);

  const body = paras.length > 0
    ? paras.join('\n\n')
    : main.textContent.replace(/\s+/g, ' ').trim();

  return { title, body: body.slice(0, 50000) };
}

// Extract text from a PDF File using pdf.js (CDN worker, no bundler config needed)
async function extractPdf(file) {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  // Try to get title from PDF metadata
  const meta = await pdf.getMetadata().catch(() => null);
  const pdfTitle = meta?.info?.Title?.trim() || '';

  const paragraphs = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // Group items into lines by y-position, then lines into paragraphs by gap
    let lines = [];
    let currentLine = { y: null, text: '' };
    for (const item of content.items) {
      if (!item.str) continue;
      const y = Math.round(item.transform[5]);
      if (currentLine.y === null || Math.abs(y - currentLine.y) < 3) {
        currentLine.y = y;
        currentLine.text += item.str;
      } else {
        if (currentLine.text.trim()) lines.push(currentLine);
        currentLine = { y, text: item.str };
      }
    }
    if (currentLine.text.trim()) lines.push(currentLine);

    // Merge lines into paragraphs: a gap > 1.5× normal line height = new paragraph
    if (lines.length === 0) continue;
    const gaps = lines.slice(1).map((l, i) => Math.abs(lines[i].y - l.y));
    const medianGap = [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)] || 12;
    const threshold = medianGap * 1.5;

    let para = lines[0].text;
    for (let j = 1; j < lines.length; j++) {
      const gap = Math.abs(lines[j - 1].y - lines[j].y);
      if (gap > threshold) {
        if (para.trim().length > 20) paragraphs.push(para.trim());
        para = lines[j].text;
      } else {
        para += ' ' + lines[j].text;
      }
    }
    if (para.trim().length > 20) paragraphs.push(para.trim());
  }

  const body = paragraphs.join('\n\n');
  const title = pdfTitle || file.name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ').trim();
  return { title: title.slice(0, 120), body: body.slice(0, 50000) };
}

export default function NewText({ onSave, onCancel, t, editingText }) {
  const isEditing = !!editingText;
  const [tab, setTab] = useState('write'); // 'write' | 'url' | 'pdf'
  const [title, setTitle] = useState(editingText?.title || '');
  const [body, setBody] = useState(editingText?.body || '');
  const [textLang, setTextLang] = useState(editingText?.language || 'en');
  const [urlInput, setUrlInput] = useState('');
  const [urlState, setUrlState] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [pdfState, setPdfState] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [pdfDrag, setPdfDrag] = useState(false);
  const taRef = useRef(null);
  const fileInputRef = useRef(null);

  const wc = wordCount(body);
  const chars = body.length;
  const canSave = title.trim().length > 0 && body.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    onSave({ title: title.trim(), body: body.trim(), language: textLang });
  };

  const handleUrlImport = async () => {
    if (!urlInput.trim()) return;
    setUrlState('loading');
    try {
      const { title: t2, body: b2 } = await fetchFromUrl(urlInput.trim());
      setTitle(t2 || title);
      setBody(b2);
      setUrlState('success');
      setTab('write');
    } catch {
      setUrlState('error');
    }
  };

  const handlePdfFile = useCallback(async (file) => {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) return;
    setPdfState('loading');
    try {
      const { title: t2, body: b2 } = await extractPdf(file);
      setTitle(t2 || title);
      setBody(b2);
      setPdfState('success');
      setTab('write');
    } catch {
      setPdfState('error');
    }
  }, [title]);

  const handlePdfDrop = useCallback((e) => {
    e.preventDefault();
    setPdfDrag(false);
    const file = e.dataTransfer.files[0];
    handlePdfFile(file);
  }, [handlePdfFile]);

  const pageTitle = isEditing ? t('newText.edit_title') : t('newText.title');
  const pageSubtitle = isEditing ? t('newText.edit_subtitle') : t('newText.subtitle');
  const saveLabel = isEditing ? t('newText.edit_save') : t('newText.save');

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <PageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        action={<Button variant="ghost" icon="arrowLeft" onClick={onCancel}>{t('newText.cancel')}</Button>}
      />

      {/* Tab bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', background: 'var(--bg-sunk)', borderRadius: 'var(--radius-sm)', padding: 3, gap: 2, border: '1px solid var(--border)' }}>
          {[{ id: 'write', icon: 'doc', label: t('newText.tab_write') }, { id: 'url', icon: 'link', label: t('newText.tab_url') }, { id: 'pdf', icon: 'download', label: t('newText.tab_pdf') }].map((tb) => {
            const active = tab === tb.id;
            return (
              <button key={tb.id} onClick={() => setTab(tb.id)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', fontSize: 13.5, fontWeight: active ? 600 : 450,
                border: 'none', borderRadius: 7,
                background: active ? 'var(--bg-elev)' : 'transparent',
                color: active ? 'var(--text)' : 'var(--text-faint)',
                boxShadow: active ? 'var(--shadow-sm)' : 'none',
                transition: 'all .14s',
              }}>
                <Icon name={tb.icon} size={15} />
                {tb.label}
              </button>
            );
          })}
        </div>

        {/* Language selector — only in write tab */}
        {tab === 'write' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-faint)' }}>{t('newText.lang_label')}:</span>
            {TEXT_LANGUAGES.map((l) => {
              const active = textLang === l.code;
              return (
                <button key={l.code} onClick={() => setTextLang(l.code)} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '4px 11px', fontSize: 13, fontWeight: active ? 600 : 450,
                  border: '1px solid', borderRadius: 99,
                  borderColor: active ? 'var(--accent)' : 'var(--border)',
                  background: active ? 'var(--accent-soft)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text-faint)',
                  transition: 'all .14s',
                }}>
                  <Icon name="globe" size={13} />
                  {t(`textLangs.${l.code}`)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* URL import tab */}
      {tab === 'url' && (
        <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 22, boxShadow: 'var(--shadow-sm)', marginBottom: 18 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', height: 44, background: 'var(--bg-sunk)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
              <Icon name="link" size={16} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
              <input
                value={urlInput}
                onChange={(e) => { setUrlInput(e.target.value); setUrlState('idle'); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleUrlImport(); }}
                placeholder={t('newText.url_ph')}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14.5, color: 'var(--text)', fontFamily: 'var(--font-ui)' }}
              />
              {urlInput && <IconButton name="x" size={14} onClick={() => { setUrlInput(''); setUrlState('idle'); }} />}
            </div>
            <Button variant="primary" icon={urlState === 'loading' ? 'loader' : 'download'}
              disabled={!urlInput.trim() || urlState === 'loading'}
              onClick={handleUrlImport}>
              {urlState === 'loading' ? t('newText.url_fetching') : t('newText.url_fetch')}
            </Button>
          </div>

          {urlState === 'success' && (
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '9px 14px', borderRadius: 'var(--radius-sm)' }}>
              <Icon name="check" size={16} stroke={2.2} /> {t('newText.url_success')}
            </div>
          )}
          {urlState === 'error' && (
            <div style={{ marginTop: 12, fontSize: 13.5, color: '#c0392b', background: 'color-mix(in srgb,#c0392b 10%,transparent)', padding: '9px 14px', borderRadius: 'var(--radius-sm)' }}>
              {t('newText.url_error')}
            </div>
          )}
        </div>
      )}

      {/* PDF import tab */}
      {tab === 'pdf' && (
        <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 22, boxShadow: 'var(--shadow-sm)', marginBottom: 18 }}>
          <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: 'none' }}
            onChange={(e) => handlePdfFile(e.target.files[0])} />

          <div
            onClick={() => pdfState !== 'loading' && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setPdfDrag(true); }}
            onDragLeave={() => setPdfDrag(false)}
            onDrop={handlePdfDrop}
            style={{
              border: `2px dashed ${pdfDrag ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-sm)',
              background: pdfDrag ? 'var(--accent-soft)' : 'var(--bg-sunk)',
              padding: '40px 24px',
              textAlign: 'center',
              cursor: pdfState === 'loading' ? 'wait' : 'pointer',
              transition: 'all .16s',
            }}>
            {pdfState === 'loading' ? (
              <>
                <Icon name="loader" size={32} style={{ color: 'var(--accent)', marginBottom: 12 }} />
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{t('newText.pdf_extracting')}</div>
                <div style={{ fontSize: 13, color: 'var(--text-faint)', marginTop: 4 }}>{t('newText.pdf_extracting_hint')}</div>
              </>
            ) : (
              <>
                <Icon name="download" size={32} style={{ color: 'var(--accent)', marginBottom: 12 }} />
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{t('newText.pdf_drop')}</div>
                <div style={{ fontSize: 13, color: 'var(--text-faint)', marginTop: 4 }}>{t('newText.pdf_drop_hint')}</div>
              </>
            )}
          </div>

          {pdfState === 'error' && (
            <div style={{ marginTop: 12, fontSize: 13.5, color: '#c0392b', background: 'color-mix(in srgb,#c0392b 10%,transparent)', padding: '9px 14px', borderRadius: 'var(--radius-sm)' }}>
              {t('newText.pdf_error')}
            </div>
          )}
        </div>
      )}

      {/* Write tab */}
      {tab === 'write' && (
        <>
          <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '8px 10px', boxShadow: 'var(--shadow-sm)' }}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('newText.title_ph')}
              maxLength={120}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); taRef.current?.focus(); } }}
              style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', padding: '16px 14px 14px', fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-ui)', letterSpacing: '-.02em', color: 'var(--text)' }}
            />
            <div style={{ height: 1, background: 'var(--border)', margin: '0 14px' }} />
            <textarea
              ref={taRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t('newText.body_ph')}
              style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', padding: '16px 14px', minHeight: 320, resize: 'vertical', fontSize: 16, lineHeight: 1.7, fontFamily: 'var(--reading-font)', color: 'var(--text)' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 18, fontSize: 13, color: 'var(--text-faint)', fontWeight: 500 }}>
              <span><strong style={{ color: 'var(--text-soft)', fontWeight: 650 }}>{wc.toLocaleString()}</strong> {t('newText.words')}</span>
              <span><strong style={{ color: 'var(--text-soft)', fontWeight: 650 }}>{chars.toLocaleString()}</strong> {t('newText.chars')}</span>
              {wc > 0 && <span>{readingTime(wc)}</span>}
            </div>
            <Button variant="primary" size="lg" icon={isEditing ? 'check' : 'book'} disabled={!canSave} onClick={save}>
              {saveLabel}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
