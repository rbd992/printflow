import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Try to send crash report to server (best-effort, silent on failure)
    try {
      const { useAuthStore } = require('./stores/authStore');
      const { serverUrl } = useAuthStore.getState();
      if (serverUrl) {
        fetch(`${serverUrl}/api/crash`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error:     error.message,
            stack:     error.stack,
            context:   errorInfo?.componentStack?.slice(0, 300),
            version:   window.printflow?.appVersion || 'unknown',
            platform:  window.printflow?.platform   || 'unknown',
            timestamp: new Date().toISOString(),
          }),
        }).catch(() => {});
      }
    } catch {}
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-page, #0a0a12)', color: 'var(--text-primary, #fff)',
        padding: 40, fontFamily: '-apple-system, sans-serif',
      }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>⚠️</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Something went wrong</h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 28, textAlign: 'center', maxWidth: 420 }}>
          PrintFlow encountered an unexpected error. The error has been logged. Try restarting the app.
        </p>

        {this.state.error && (
          <div style={{
            padding: '12px 16px', background: 'rgba(255,69,58,0.12)', borderRadius: 10,
            border: '0.5px solid rgba(255,69,58,0.3)', marginBottom: 24,
            maxWidth: 520, width: '100%', overflowX: 'auto',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,69,58,0.8)', marginBottom: 6 }}>Error</div>
            <code style={{ fontSize: 12, color: 'rgba(255,120,100,0.9)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {this.state.error.message}
            </code>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => window.location.reload()}
            style={{ padding: '10px 24px', borderRadius: 10, background: '#0071e3', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
            Reload App
          </button>
          <button onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
            style={{ padding: '10px 24px', borderRadius: 10, background: 'rgba(255,255,255,0.1)', color: '#fff', border: '0.5px solid rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 14 }}>
            Try Again
          </button>
        </div>
      </div>
    );
  }
}
