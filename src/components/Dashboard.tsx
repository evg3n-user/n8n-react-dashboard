import { useEffect, useState } from 'react';
import { getWorkflows, getExecutions, toggleWorkflow } from '../n8nApi';
import type { Workflow, Execution } from '../n8nApi';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    success: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    error: 'bg-red-500/20 text-red-400 border-red-500/30',
    running: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    waiting: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colors[status] || 'bg-zinc-700 text-zinc-400 border-zinc-600'}`}>
      {status}
    </span>
  );
}

export default function Dashboard() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'workflows' | 'executions'>('workflows');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [wfs, execs] = await Promise.all([getWorkflows(), getExecutions(15)]);
      setWorkflows(wfs);
      // Attach workflow names to executions
      const wfMap = new Map(wfs.map(w => [w.id, w.name]));
      setExecutions(execs.map(e => ({ ...e, workflowName: wfMap.get(e.workflowId) || e.workflowId.slice(0, 8) })));
    } catch (e: any) {
      setError(e.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleToggle = async (wf: Workflow) => {
    try {
      await toggleWorkflow(wf.id, wf.active);
      fetchData();
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm flex justify-between">
          <span>⚠ {error}</span>
          <button onClick={fetchData} className="underline">Retry</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-800/50 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('workflows')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'workflows' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          ⚡ Workflows ({workflows.length})
        </button>
        <button
          onClick={() => setActiveTab('executions')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'executions' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          📜 Executions ({executions.length})
        </button>
      </div>

      {/* Workflow List */}
      {activeTab === 'workflows' && (
        <div className="grid gap-3">
          {workflows.length === 0 ? (
            <div className="text-zinc-500 text-center py-12">No workflows yet. Create one in n8n!</div>
          ) : (
            workflows.map(wf => (
              <div key={wf.id} className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-5 hover:border-zinc-600/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-medium text-lg">{wf.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-block w-2 h-2 rounded-full ${wf.active ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`}></span>
                      <span className="text-sm text-zinc-400">{wf.active ? 'Active' : 'Inactive'}</span>
                      <span className="text-zinc-600">·</span>
                      <span className="text-sm text-zinc-500">Updated {formatDate(wf.updatedAt)}</span>
                    </div>
                    {wf.tags.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {wf.tags.map(tag => (
                          <span key={tag.id} className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20">
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggle(wf)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      wf.active
                        ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                    }`}
                  >
                    {wf.active ? '▶ Deactivate' : '▶ Activate'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Executions List */}
      {activeTab === 'executions' && (
        <div className="overflow-x-auto">
          {executions.length === 0 ? (
            <div className="text-zinc-500 text-center py-12">No executions yet. Trigger a workflow!</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 text-left border-b border-zinc-700/50">
                  <th className="pb-3 font-medium">Workflow</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Mode</th>
                  <th className="pb-3 font-medium">Started</th>
                  <th className="pb-3 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody>
                {executions.map(exec => {
                  const duration = exec.stoppedAt
                    ? Math.round((new Date(exec.stoppedAt).getTime() - new Date(exec.startedAt).getTime()) / 1000)
                    : null;
                  return (
                    <tr key={exec.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                      <td className="py-3 text-white">{exec.workflowName}</td>
                      <td className="py-3"><StatusBadge status={exec.status} /></td>
                      <td className="py-3 text-zinc-400 capitalize">{exec.mode}</td>
                      <td className="py-3 text-zinc-400">{formatDate(exec.startedAt)}</td>
                      <td className="py-3 text-zinc-400">{duration !== null ? `${duration}s` : '...'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Refresh */}
      <button
        onClick={fetchData}
        className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        ↻ Refresh
      </button>
    </div>
  );
}
