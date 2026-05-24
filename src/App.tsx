import Dashboard from './components/Dashboard';

export default function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand-lockup" href="/">
          <span className="brand-mark">n8</span>
          <strong>n8n Control Desk</strong>
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
          <h1>Configure and run workflows</h1>
          <p>
            Set webhook parameters, watch execution state, and download artifacts — all from one dashboard.
          </p>
        </section>

        <Dashboard />
      </main>
    </div>
  );
}
