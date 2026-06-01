import { useState, useRef } from 'react';
import { Icon, PageHeader } from '../components/ui.jsx';
import { UI_LANGUAGES, NATIVE_LANGUAGES, TEXT_LANGUAGES } from '../utils/i18n.js';
import { calcStats, ALL_STORAGE_KEYS, load, save } from '../utils/storage.js';
import { getAllImages, restoreImages } from '../utils/imageStore.js';

// ---- Shared primitives ------------------------------------------------------
function Section({ label }) {
  return (
    <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.07em', color: 'var(--text-faint)', marginBottom: 10, marginTop: 4 }}>
      {label}
    </div>
  );
}

function SettingCard({ children }) {
  return (
    <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: 24, boxShadow: 'var(--shadow-sm)' }}>
      {children}
    </div>
  );
}

function SettingRow({ label, hint, children, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 18px', borderBottom: last ? 'none' : '1px solid var(--border)' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{label}</div>
        {hint && <div style={{ fontSize: 12.5, color: 'var(--text-faint)', marginTop: 2 }}>{hint}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function SegControl({ options, value, onChange, small }) {
  return (
    <div style={{ display: 'flex', background: 'var(--bg-sunk)', borderRadius: 8, padding: 3, gap: 2, border: '1px solid var(--border)' }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button key={opt.value} onClick={() => onChange(opt.value)} style={{
            padding: small ? '5px 12px' : '7px 16px',
            fontSize: small ? 13 : 13.5, fontWeight: active ? 600 : 450,
            border: 'none', borderRadius: 6,
            background: active ? 'var(--bg-elev)' : 'transparent',
            color: active ? 'var(--text)' : 'var(--text-faint)',
            boxShadow: active ? 'var(--shadow-sm)' : 'none',
            transition: 'all .15s ease', whiteSpace: 'nowrap',
          }}>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} role="switch" aria-checked={value}
      style={{ position: 'relative', width: 44, height: 24, borderRadius: 99, border: 'none', padding: 0, background: value ? 'var(--accent)' : 'var(--border-strong)', transition: 'background .2s ease', cursor: 'pointer' }}>
      <span style={{
        position: 'absolute', top: 3, left: value ? 23 : 3,
        width: 18, height: 18, borderRadius: 99, background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,.25)', transition: 'left .18s ease',
      }} />
    </button>
  );
}

function ColorSwatch({ color, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: 28, height: 28, borderRadius: 8, border: 'none', background: color, cursor: 'pointer', flexShrink: 0,
      boxShadow: active ? `0 0 0 2px var(--bg-elev), 0 0 0 4px ${color}` : 'var(--shadow-sm)',
      transition: 'box-shadow .15s', position: 'relative', display: 'grid', placeItems: 'center',
    }}>
      {active && <Icon name="check" size={14} stroke={2.5} style={{ color: '#fff' }} />}
    </button>
  );
}

// ---- Settings page ----------------------------------------------------------
export default function Settings({ tweaks, setTweak, settings, setSetting, t, texts, words, reads }) {
  const stats = calcStats(texts || [], words || [], reads || {});
  const importRef = useRef(null);
  const [importStatus, setImportStatus] = useState(null); // 'ok' | 'err' | null

  const handleExport = async () => {
    const storage = {};
    for (const key of ALL_STORAGE_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw) storage[key] = JSON.parse(raw);
    }
    const images = await getAllImages();
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: Date.now(), storage, images }, null, 0)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yelreader-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!window.confirm(t('settings.import_confirm'))) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.version || !data.storage) throw new Error('invalid');
      for (const [key, value] of Object.entries(data.storage)) {
        save(key, value);
      }
      if (data.images) await restoreImages(data.images);
      setImportStatus('ok');
      setTimeout(() => window.location.reload(), 1200);
    } catch {
      setImportStatus('err');
      setTimeout(() => setImportStatus(null), 4000);
    }
  };
  const ACCENTS = ['#0F766E', '#4F46E5', '#15803D', '#BE123C', '#B45309', '#0369A1'];
  const FONTS = ['Lora', 'Newsreader', 'Playfair'];
  const fontLabels = { Lora: 'Lora', Newsreader: 'Newsreader', Playfair: 'Playfair' };

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', animation: 'fadeUp .35s ease' }}>
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      {/* Interface section */}
      <Section label={t('settings.s_interface')} />
      <SettingCard>
        <SettingRow label={t('settings.app_lang')} last>
          <SegControl
            value={settings.uiLanguage}
            onChange={(v) => setSetting('uiLanguage', v)}
            options={UI_LANGUAGES.map((l) => ({ value: l.code, label: l.label }))}
          />
        </SettingRow>
      </SettingCard>

      {/* Language section */}
      <Section label={t('settings.s_language')} />
      <SettingCard>
        <SettingRow label={t('settings.native_lang')}
          hint={t('settings.uiLanguage') === 'en' ? 'Used for native-language definitions' : 'Anadil tanımları için kullanılır'}>
          <SegControl
            value={settings.nativeLanguage}
            onChange={(v) => setSetting('nativeLanguage', v)}
            options={NATIVE_LANGUAGES.map((l) => ({ value: l.code, label: t(`nativeLangs.${l.code}`) }))}
          />
        </SettingRow>
        <SettingRow label={t('settings.def_in')} last
          hint={settings.definitionIn === 'native'
            ? (settings.uiLanguage === 'tr' ? 'Free Dictionary + Lingva çevirisi — ücretsiz, sınırsız' : 'Free Dictionary + Lingva translation — free, unlimited')
            : (settings.uiLanguage === 'tr' ? 'Doğrudan Free Dictionary API' : 'Directly from Free Dictionary API')}>
          <SegControl
            value={settings.definitionIn}
            onChange={(v) => setSetting('definitionIn', v)}
            options={[
              { value: 'source', label: t('settings.def_source') },
              { value: 'native', label: t('settings.def_native') },
            ]}
          />
        </SettingRow>
      </SettingCard>

      {/* Appearance section */}
      <Section label={t('settings.s_appearance')} />
      <SettingCard>
        {/* Dark mode */}
        <SettingRow label={t('settings.dark_mode')}>
          <Toggle value={tweaks.dark} onChange={(v) => setTweak('dark', v)} />
        </SettingRow>

        {/* Accent color */}
        <SettingRow label={t('settings.accent')}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {ACCENTS.map((c) => (
              <ColorSwatch key={c} color={c} active={tweaks.accent === c} onClick={() => setTweak('accent', c)} />
            ))}
          </div>
        </SettingRow>

        {/* Reading font */}
        <SettingRow label={t('settings.font')}>
          <SegControl
            small
            value={tweaks.readingFont}
            onChange={(v) => setTweak('readingFont', v)}
            options={FONTS.map((f) => ({ value: f, label: fontLabels[f] }))}
          />
        </SettingRow>

        {/* Text size */}
        <SettingRow label={t('settings.size')} last>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-faint)', width: 36, textAlign: 'right' }}>{tweaks.readingSize}px</span>
            <input type="range" min={16} max={26} step={1} value={tweaks.readingSize}
              onChange={(e) => setTweak('readingSize', Number(e.target.value))}
              style={{ width: 120, accentColor: 'var(--accent)' }} />
          </div>
        </SettingRow>
      </SettingCard>

      {/* Font preview */}
      <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 22px', boxShadow: 'var(--shadow-sm)' }}>
        <p style={{ margin: 0, fontFamily: 'var(--reading-font)', fontSize: 'var(--reading-size)', lineHeight: 1.75, color: 'var(--text)' }}>
          The tide came in slowly that evening, a relentless murmur against the rocks.
        </p>
      </div>

      {/* Statistics section */}
      <Section label={t('settings.s_stats')} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: t('settings.stat_texts_saved'), value: stats.textsTotal, icon: 'library' },
          { label: t('settings.stat_texts_read'), value: stats.textsRead, icon: 'book' },
          { label: t('settings.stat_words_total'), value: stats.wordsTotal, icon: 'bookmark' },
          { label: t('settings.stat_words_week'), value: stats.wordsThisWeek, icon: 'sparkle' },
        ].map((s) => (
          <div key={s.label} style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 18px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8, color: 'var(--accent)' }}>
              <Icon name={s.icon} size={16} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', letterSpacing: '-.02em', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-faint)', marginTop: 5, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>
      {stats.streak > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', background: 'var(--accent-soft)', border: '1px solid color-mix(in srgb,var(--accent) 30%,transparent)', borderRadius: 'var(--radius)', fontSize: 14.5, fontWeight: 600, color: 'var(--accent)' }}>
          <Icon name="zap" size={20} />
          {stats.streak} {t('settings.stat_streak')}
        </div>
      )}

      {/* Data section */}
      <Section label={t('settings.s_data')} />
      <SettingCard>
        <SettingRow label={t('settings.export')} hint={t('settings.export_hint')}>
          <button onClick={handleExport} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 16px', fontSize: 13.5, fontWeight: 600, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-sunk)', color: 'var(--text)', cursor: 'pointer', transition: 'all .14s' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text)'; }}>
            <Icon name="download" size={15} /> {t('settings.export_btn')}
          </button>
        </SettingRow>
        <SettingRow label={t('settings.import')} hint={t('settings.import_hint')} last>
          <div>
            <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
            <button onClick={() => importRef.current?.click()} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 16px', fontSize: 13.5, fontWeight: 600, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-sunk)', color: 'var(--text)', cursor: 'pointer', transition: 'all .14s' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text)'; }}>
              <Icon name="upload" size={15} /> {t('settings.import_btn')}
            </button>
          </div>
        </SettingRow>
      </SettingCard>

      {/* Import status */}
      {importStatus && (
        <div style={{ padding: '11px 16px', borderRadius: 'var(--radius-sm)', fontSize: 13.5, fontWeight: 500, marginBottom: 16, animation: 'fadeUp .25s ease', background: importStatus === 'ok' ? 'var(--accent-soft)' : 'color-mix(in srgb,#c0392b 10%,transparent)', color: importStatus === 'ok' ? 'var(--accent)' : '#c0392b', border: `1px solid ${importStatus === 'ok' ? 'color-mix(in srgb,var(--accent) 30%,transparent)' : 'color-mix(in srgb,#c0392b 30%,transparent)'}` }}>
          {importStatus === 'ok' ? t('settings.import_ok') : t('settings.import_err')}
        </div>
      )}
    </div>
  );
}
