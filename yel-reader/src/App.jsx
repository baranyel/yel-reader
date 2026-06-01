import { useState, useEffect, useRef, useCallback } from 'react';
import { Icon, Logo, Button, IconButton, EmptyState, useToast } from './components/ui.jsx';
import Home from './pages/Home.jsx';
import NewText from './pages/NewText.jsx';
import ReadText from './pages/ReadText.jsx';
import MyWords from './pages/MyWords.jsx';
import Quiz from './pages/Quiz.jsx';
import Review from './pages/Review.jsx';
import Settings from './pages/Settings.jsx';
import Notes from './pages/Notes.jsx';
import {
  load, save, ensureSeeded, uid, logRead,
  TEXTS_KEY, WORDS_KEY, TWEAKS_KEY, SETTINGS_KEY, READS_KEY, HIGHLIGHTS_KEY, NOTES_KEY, SETTINGS_DEFAULTS,
} from './utils/storage.js';
import { getT } from './utils/i18n.js';

const FONT_MAP = {
  Lora: "'Lora', Georgia, serif",
  Newsreader: "'Newsreader', Georgia, serif",
  Playfair: "'Playfair Display', Georgia, serif",
};

const TWEAK_DEFAULTS = {
  accent: '#0F766E',
  readingFont: 'Lora',
  readingSize: 20,
  radius: 12,
  dark: false,
};

// ---- NavItem (supports optional badge count) --------------------------------
function NavItem({ item, active, collapsed, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick} title={collapsed ? item.label : undefined}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%',
        padding: collapsed ? '11px' : '11px 13px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: 'var(--radius-sm)', border: 'none',
        background: active ? 'var(--accent-soft)' : hover ? 'var(--surface-hover)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text-soft)',
        fontSize: 14.5, fontWeight: active ? 650 : 500,
        transition: 'background .16s, color .16s', position: 'relative',
      }}>
      <Icon name={item.icon} size={20} stroke={active ? 2 : 1.8} />
      {!collapsed && <span>{item.label}</span>}
      {item.badge ? (
        <span style={{
          position: 'absolute',
          right: collapsed ? 4 : 8,
          top: collapsed ? 4 : '50%',
          transform: collapsed ? 'none' : 'translateY(-50%)',
          background: 'var(--accent)', color: 'var(--accent-contrast)',
          borderRadius: 99, fontSize: 11, fontWeight: 700,
          padding: '1px 6px', minWidth: 18, textAlign: 'center', lineHeight: '18px',
        }}>
          {item.badge}
        </span>
      ) : (active && !collapsed && (
        <span style={{ position: 'absolute', right: 11, width: 6, height: 6, borderRadius: 99, background: 'var(--accent)' }} />
      ))}
    </button>
  );
}

// ---- Sidebar ----------------------------------------------------------------
function Sidebar({ nav, view, collapsed, onNav, onToggle, dark, onToggleTheme, t }) {
  return (
    <aside style={{
      width: collapsed ? 76 : 250, flexShrink: 0, height: '100%',
      borderRight: '1px solid var(--border)', background: 'var(--bg-elev)',
      display: 'flex', flexDirection: 'column',
      padding: collapsed ? '18px 14px' : '18px 16px',
      transition: 'width .22s cubic-bezier(.4,0,.2,1)', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: collapsed ? 'center' : 'space-between', marginBottom: 26, minHeight: 36 }}>
        {!collapsed ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Logo size={32} />
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--text)' }}>
              Yel<span style={{ color: 'var(--accent)' }}>Reader</span>
            </span>
          </div>
        ) : <Logo size={32} />}
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {nav.map((item) => (
          <NavItem key={item.id} item={item}
            active={
              view === item.id ||
              (item.id === 'library' && (view === 'read' || view === 'edit')) ||
              (item.id === 'words' && view === 'quiz')
            }
            collapsed={collapsed} onClick={() => onNav(item.id)} />
        ))}
      </nav>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <button onClick={onToggleTheme} title={dark ? t('common.light_mode') : t('common.dark_mode')}
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: collapsed ? '11px' : '11px 13px', justifyContent: collapsed ? 'center' : 'flex-start', borderRadius: 'var(--radius-sm)', border: 'none', background: 'transparent', color: 'var(--text-soft)', fontSize: 14, fontWeight: 500 }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          <Icon name={dark ? 'sun' : 'moon'} size={19} />
          {!collapsed && <span>{dark ? t('common.light_mode') : t('common.dark_mode')}</span>}
        </button>
        <button onClick={onToggle} title={collapsed ? t('common.expand') : t('common.collapse')}
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: collapsed ? '11px' : '11px 13px', justifyContent: collapsed ? 'center' : 'flex-start', borderRadius: 'var(--radius-sm)', border: 'none', background: 'transparent', color: 'var(--text-faint)', fontSize: 14, fontWeight: 500 }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={19} />
          {!collapsed && <span>{collapsed ? t('common.expand') : t('common.collapse')}</span>}
        </button>
      </div>
    </aside>
  );
}

// ---- Mobile TabBar ----------------------------------------------------------
function TabBar({ nav, view, onNav }) {
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
      display: 'flex', background: 'var(--bg-elev)', borderTop: '1px solid var(--border)',
      paddingBottom: 'env(safe-area-inset-bottom)', boxShadow: '0 -2px 14px rgba(0,0,0,.05)',
    }}>
      {nav.map((item) => {
        const active = view === item.id
          || (item.id === 'library' && (view === 'read' || view === 'edit'))
          || (item.id === 'words' && view === 'quiz');
        return (
          <button key={item.id} onClick={() => onNav(item.id)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            padding: '10px 0 12px', border: 'none', background: 'transparent', position: 'relative',
            color: active ? 'var(--accent)' : 'var(--text-faint)', fontSize: 11, fontWeight: active ? 650 : 500,
          }}>
            <Icon name={item.icon} size={22} stroke={active ? 2 : 1.8} />
            {item.label}
            {item.badge && (
              <span style={{ position: 'absolute', top: 6, right: '50%', marginRight: -18, background: 'var(--accent)', color: '#fff', borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '0 5px', minWidth: 16, textAlign: 'center', lineHeight: '16px' }}>
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

// ---- App --------------------------------------------------------------------
export default function App() {
  const [tweaks, setTweaksState] = useState(() => ({ ...TWEAK_DEFAULTS, ...load(TWEAKS_KEY, {}) }));
  const [settings, setSettingsState] = useState(() => ({ ...SETTINGS_DEFAULTS, ...load(SETTINGS_KEY, {}) }));
  const [view, setView] = useState('library');
  const [currentId, setCurrentId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [texts, setTexts] = useState([]);
  const [words, setWords] = useState([]);
  const [reads, setReads] = useState({});
  const [highlights, setHighlights] = useState({});
  const [notes, setNotes] = useState({});
  const [booting, setBooting] = useState(true);
  const [readLoading, setReadLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 860);
  const [progress, setProgress] = useState(0);
  const scrollRef = useRef(null);
  const toast = useToast();

  const t = getT(settings.uiLanguage);

  const setTweak = useCallback((key, value) => {
    setTweaksState((prev) => { const next = { ...prev, [key]: value }; save(TWEAKS_KEY, next); return next; });
  }, []);

  const setSetting = useCallback((key, value) => {
    setSettingsState((prev) => { const next = { ...prev, [key]: value }; save(SETTINGS_KEY, next); return next; });
  }, []);

  // Review badge: words with definitions that are due
  const dueCount = words.filter(
    (w) => w.definition && (!w.sm2_nextReview || w.sm2_nextReview <= Date.now())
  ).length;

  const noteCount = Object.keys(notes).length;

  const nav = [
    { id: 'library', label: t('nav.library'), icon: 'library' },
    { id: 'new', label: t('nav.new'), icon: 'plus' },
    { id: 'words', label: t('nav.words'), icon: 'words' },
    { id: 'notes', label: t('nav.notes'), icon: 'note', badge: noteCount || null },
    { id: 'review', label: t('nav.review'), icon: 'repeat', badge: dueCount || null },
    { id: 'settings', label: t('nav.settings'), icon: 'settings' },
  ];

  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty('--accent', tweaks.accent);
    r.style.setProperty('--reading-font', FONT_MAP[tweaks.readingFont] || FONT_MAP.Lora);
    r.style.setProperty('--reading-size', tweaks.readingSize + 'px');
    r.style.setProperty('--radius', tweaks.radius + 'px');
    r.style.setProperty('--radius-sm', Math.max(4, tweaks.radius - 3) + 'px');
    r.style.setProperty('--radius-lg', tweaks.radius + 6 + 'px');
    r.setAttribute('data-theme', tweaks.dark ? 'dark' : 'light');
  }, [tweaks]);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 860);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  useEffect(() => {
    ensureSeeded();
    const id = setTimeout(() => {
      setTexts(load(TEXTS_KEY, []));
      setWords(load(WORDS_KEY, []));
      setReads(load(READS_KEY, {}));
      setHighlights(load(HIGHLIGHTS_KEY, {}));
      setNotes(load(NOTES_KEY, {}));
      setBooting(false);
    }, 720);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 1);
    };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [view, currentId, readLoading]);

  const persistTexts = (next) => { setTexts(next); save(TEXTS_KEY, next); };
  const persistWords = (next) => { setWords(next); save(WORDS_KEY, next); };

  const goTo = (v) => {
    if (['library', 'words', 'new', 'settings', 'quiz', 'review', 'notes'].includes(v)) {
      if (v === 'new') setEditingId(null);
      setView(v);
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }
  };

  const openText = useCallback((id) => {
    setCurrentId(id);
    setView('read');
    setReadLoading(true);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setProgress(0);
    setTimeout(() => setReadLoading(false), 480);
    setReads((prev) => { const next = { ...prev, [id]: Date.now() }; logRead(id); return next; });
  }, []);

  const startEdit = useCallback((id) => {
    setEditingId(id);
    setView('edit');
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, []);

  const addText = (data) => {
    const text = { id: uid(), title: data.title, body: data.body, language: data.language || 'en', savedAt: Date.now() };
    persistTexts([text, ...texts]);
    toast({ message: t('toast.text_saved'), icon: 'check' });
    openText(text.id);
  };

  const updateText = (data) => {
    const next = texts.map((x) =>
      x.id === editingId ? { ...x, title: data.title, body: data.body, language: data.language || x.language } : x
    );
    persistTexts(next);
    setEditingId(null);
    toast({ message: t('toast.text_updated'), icon: 'check' });
    openText(editingId);
  };

  const deleteText = (id) => {
    persistTexts(texts.filter((x) => x.id !== id));
    if ((view === 'read' || view === 'edit') && currentId === id) goTo('library');
    toast({ message: t('toast.text_deleted'), icon: 'trash', tone: 'danger' });
  };

  // Update any field(s) on a word by its key
  const updateWordFields = useCallback((word, fields) => {
    persistWords(words.map((w) => w.word === word ? { ...w, ...fields } : w));
  }, [words]);

  const saveWord = (word, sourceText, defData) => {
    if (words.some((w) => w.word === word)) {
      toast({ message: t('toast.word_dupe', word), icon: 'bookmark' });
      return;
    }
    persistWords([{
      word,
      sourceId: sourceText.id,
      sourceTitle: sourceText.title,
      savedAt: Date.now(),
      definition: defData?.definition || null,
      pos: defData?.pos || null,
      example: defData?.example || null,
      lang: defData?.lang || 'en',
      note: null,
      // SM-2 initialization — review after 1 day
      sm2_interval: 1,
      sm2_repetition: 0,
      sm2_efactor: 2.5,
      sm2_nextReview: Date.now() + 24 * 60 * 60 * 1000,
    }, ...words]);
    toast({ message: t('toast.word_saved', word), icon: 'bookmark' });
  };

  const deleteWord = (word) => {
    persistWords(words.filter((w) => w.word !== word));
    toast({ message: t('toast.word_removed', word), icon: 'trash', tone: 'danger' });
  };

  // Highlights
  const addHighlight = useCallback((textId, word, color) => {
    setHighlights((prev) => {
      const next = { ...prev, [textId]: { ...(prev[textId] || {}), [word]: color } };
      save(HIGHLIGHTS_KEY, next);
      return next;
    });
  }, []);

  const removeHighlight = useCallback((textId, word) => {
    setHighlights((prev) => {
      const textHl = { ...(prev[textId] || {}) };
      delete textHl[word];
      const next = { ...prev, [textId]: textHl };
      save(HIGHLIGHTS_KEY, next);
      return next;
    });
  }, []);

  const handleHighlight = useCallback((word, color) => {
    if (!currentId) return;
    if (color) addHighlight(currentId, word, color);
    else removeHighlight(currentId, word);
  }, [currentId, addHighlight, removeHighlight]);

  const current = texts.find((x) => x.id === currentId);
  const editingText = editingId ? texts.find((x) => x.id === editingId) : null;
  const contentPad = isMobile ? '20px 16px 96px' : '32px 40px 40px';
  const definitionOptions = { definitionIn: settings.definitionIn, nativeLanguage: settings.nativeLanguage };
  const currentHighlights = currentId ? (highlights[currentId] || {}) : {};

  let page;
  if (view === 'library') {
    page = <Home texts={texts} loading={booting} onOpen={openText} onDelete={deleteText} onEdit={startEdit} onNew={() => goTo('new')} t={t} />;
  } else if (view === 'new' || view === 'edit') {
    page = <NewText onSave={editingId ? updateText : addText} onCancel={() => goTo('library')} editingText={editingText} t={t} />;
  } else if (view === 'words') {
    page = <MyWords words={words} onDelete={deleteWord} onOpenSource={openText} onBrowse={() => goTo('library')} onStartQuiz={() => goTo('quiz')} onUpdateNote={(word, note) => updateWordFields(word, { note })} t={t} />;
  } else if (view === 'quiz') {
    page = <Quiz words={words} onBack={() => goTo('words')} t={t} />;
  } else if (view === 'review') {
    page = <Review words={words} onBack={() => goTo('words')} onUpdateWord={(word, fields) => updateWordFields(word, fields)} t={t} />;
  } else if (view === 'settings') {
    page = <Settings tweaks={tweaks} setTweak={setTweak} settings={settings} setSetting={setSetting} t={t} texts={texts} words={words} reads={reads} />;
  } else if (view === 'notes') {
    page = <Notes notes={notes} t={t}
      onOpenText={(textId) => openText(textId)}
      onDeleteNote={(id) => {
        setNotes((prev) => { const next = { ...prev }; delete next[id]; save(NOTES_KEY, next); return next; });
        toast({ message: t('toast.note_deleted'), icon: 'trash', tone: 'danger' });
      }}
      onNoteSaved={(note) => {
        setNotes((prev) => { const next = { ...prev, [note.id]: note }; save(NOTES_KEY, next); return next; });
        toast({ message: t('toast.note_saved'), icon: 'bookmark' });
      }} />;
  } else if (view === 'read') {
    page = current
      ? <ReadText
          text={current} savedWords={words} onSaveWord={saveWord}
          onBack={() => goTo('library')} loading={readLoading} progress={progress}
          t={t} definitionOptions={definitionOptions}
          highlights={currentHighlights}
          onHighlight={handleHighlight}
          onUpdateNote={(word, note) => updateWordFields(word, { note })}
          onPageChange={() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }}
          notes={notes}
          onNoteSaved={(note) => {
            setNotes((prev) => { const next = { ...prev, [note.id]: note }; save(NOTES_KEY, next); return next; });
            toast({ message: t('toast.note_saved'), icon: 'bookmark' });
          }}
          onNoteDeleted={(id) => {
            setNotes((prev) => { const next = { ...prev }; delete next[id]; save(NOTES_KEY, next); return next; });
            toast({ message: t('toast.note_deleted'), icon: 'trash', tone: 'danger' });
          }}
        />
      : <EmptyState icon="doc" title="Text not found" body="This text may have been deleted."
          action={<Button variant="primary" icon="library" onClick={() => goTo('library')}>{t('nav.library')}</Button>} />;
  }

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      {!isMobile && (
        <Sidebar nav={nav} view={view} collapsed={collapsed} onNav={goTo}
          onToggle={() => setCollapsed((c) => !c)}
          dark={tweaks.dark} onToggleTheme={() => setTweak('dark', !tweaks.dark)} t={t} />
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%' }}>
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elev)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <Logo size={28} />
              <span style={{ fontSize: 16.5, fontWeight: 700, letterSpacing: '-.02em' }}>
                Yel<span style={{ color: 'var(--accent)' }}>Reader</span>
              </span>
            </div>
            <IconButton name={tweaks.dark ? 'sun' : 'moon'} onClick={() => setTweak('dark', !tweaks.dark)} title="Toggle theme" />
          </div>
        )}

        <main ref={scrollRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', position: 'relative' }}>
          {view === 'read' && !readLoading && (
            <div style={{ position: 'sticky', top: 0, zIndex: 30, height: 3 }}>
              <div style={{ height: '100%', width: Math.round(progress * 100) + '%', background: 'var(--accent)', transition: 'width .1s linear', borderRadius: '0 2px 2px 0' }} />
            </div>
          )}
          <div style={{ padding: contentPad, minHeight: '100%' }}>
            {page}
          </div>
        </main>
      </div>

      {isMobile && <TabBar nav={nav} view={view} onNav={goTo} />}
    </div>
  );
}
