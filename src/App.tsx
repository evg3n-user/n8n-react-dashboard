import Dashboard from './components/Dashboard';

export default function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">n8n Dashboard</h1>
              <p className="text-xs text-zinc-500">
                React + TypeScript · AI Automation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://n8n.ghomelab.cc"
              target="_blank"
              rel="noopener"
              className="text-sm text-zinc-400 hover:text-emerald-400 transition-colors"
            >
              Open n8n ↗
            </a>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Connected"></span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-4">
            <div className="text-zinc-500 text-xs uppercase tracking-wide">Workflows</div>
            <div className="text-2xl font-bold text-white mt-1" id="wf-count">—</div>
          </div>
          <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-4">
            <div className="text-zinc-500 text-xs uppercase tracking-wide">Executions (24h)</div>
            <div className="text-2xl font-bold text-white mt-1" id="exec-count">—</div>
          </div>
          <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-4">
            <div className="text-zinc-500 text-xs uppercase tracking-wide">Success Rate</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1" id="success-rate">—</div>
          </div>
        </div>

        <Dashboard />
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 mt-auto">
        <div className="max-w-5xl mx-auto px-6 py-4 text-center text-xs text-zinc-600">
          Built with React · TypeScript · Tailwind CSS · n8n API | Portfolio Project
        </div>
      </footer>
    </div>
  );
}
