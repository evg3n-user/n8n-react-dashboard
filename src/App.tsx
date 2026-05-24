import Dashboard from './components/Dashboard';

export default function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand-lockup" href="/">
          <span className="brand-mark">N8</span>
          <span>
            <strong>n8n Control Desk</strong>
            <small>Webhook runs, execution state, export artifacts</small>
          </span>
        </a>
        <nav className="top-actions" aria-label="Primary">
          <a href="https://n8n.ghomelab.cc" target="_blank" rel="noopener">
            Open n8n
          </a>
          <span className="connection-pill">API linked</span>
        </nav>
      </header>

      <main>
        <section className="hero-band">
          <div>
            <p className="eyebrow">Automation console</p>
            <h1>Run workflows like production jobs.</h1>
          </div>
          <p>
            Configure webhook payloads, watch execution state, and pull artifacts without leaving the dashboard.
          </p>
        </section>

        <Dashboard />
      </main>
    </div>
  );
}
