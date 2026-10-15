import { Component } from 'react';
import { getT } from '../utils/i18n.js';
import { load, SETTINGS_KEY } from '../utils/storage.js';
import { downloadBackup, resetAllData } from '../utils/backup.js';

// Last line of defence: if rendering crashes (for example because of corrupted saved data),
// show a way out instead of a blank page — including a chance to save the user's data first.
export default class ErrorBoundary extends Component {
  state = { error: null, busy: false, message: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('YelReader crashed:', error, info?.componentStack);
  }

  t = (path) => getT(load(SETTINGS_KEY, {}).uiLanguage || 'tr')(path);

  exportData = async () => {
    this.setState({ busy: true, message: null });
    try {
      await downloadBackup();
      this.setState({ busy: false, message: this.t('error.exported') });
    } catch {
      this.setState({ busy: false, message: this.t('error.export_failed') });
    }
  };

  reset = async () => {
    if (!window.confirm(this.t('error.reset_confirm'))) return;
    this.setState({ busy: true });
    await resetAllData();
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    const t = this.t;
    const btn = (primary) => ({
      padding: '10px 16px', fontSize: 14, fontWeight: 600, borderRadius: 9, cursor: 'pointer',
      border: primary ? '1px solid transparent' : '1px solid var(--border)',
      background: primary ? 'var(--accent)' : 'var(--bg-elev)',
      color: primary ? 'var(--accent-contrast)' : 'var(--text)',
    });
    return (
      <div style={{ minHeight: '100%', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--bg)' }}>
        <div style={{ maxWidth: 460, textAlign: 'center' }}>
          <h1 style={{ margin: '0 0 10px', fontSize: 24, color: 'var(--text)' }}>{t('error.title')}</h1>
          <p style={{ margin: '0 0 22px', fontSize: 15, lineHeight: 1.6, color: 'var(--text-soft)' }}>{t('error.body')}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button style={btn(true)} onClick={() => window.location.reload()}>{t('error.reload')}</button>
            <button style={btn(false)} disabled={this.state.busy} onClick={this.exportData}>{t('error.export')}</button>
            <button style={{ ...btn(false), color: '#c0392b' }} disabled={this.state.busy} onClick={this.reset}>{t('error.reset')}</button>
          </div>
          {this.state.message && <p style={{ marginTop: 16, fontSize: 13.5, color: 'var(--text-faint)' }}>{this.state.message}</p>}
          <details style={{ marginTop: 22, textAlign: 'left', fontSize: 12, color: 'var(--text-faint)' }}>
            <summary style={{ cursor: 'pointer' }}>{t('error.details')}</summary>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{String(this.state.error?.stack || this.state.error)}</pre>
          </details>
        </div>
      </div>
    );
  }
}
