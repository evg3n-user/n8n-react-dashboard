import { useEffect, useMemo, useState } from 'react';
import ArtifactViewer from './ArtifactViewer';
import WorkflowConfigModal, { defaultWorkflowConfig } from './WorkflowConfig';
import {
  getExecutions,
  getWorkflows,
  pollExecution,
  toggleWorkflow,
  triggerWorkflowWithConfig,
} from '../n8nApi';
import type {
  Execution,
  ExecutionArtifact,
  TriggerWorkflowResponse,
  Workflow,
  WorkflowConfig,
} from '../n8nApi';
import type { WorkflowConfigDraft } from './WorkflowConfig';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === 'success') return 'status-badge status-success';
  if (normalized === 'error' || normalized === 'crashed') return 'status-badge status-error';
  if (normalized === 'running') return 'status-badge status-running';
  if (normalized === 'waiting') return 'status-badge status-waiting';
  return 'status-badge';
}

function getWebhookName(workflow: Workflow) {
  return workflow.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function buildExecutionArtifact(execution: Execution): ExecutionArtifact {
  return {
    executionId: execution.id,
    status: execution.status,
    finished: execution.finished,
    startedAt: execution.startedAt,
    stoppedAt: execution.stoppedAt,
    workflowId: execution.workflowId,
    workflowName: execution.workflowName,
    result: execution,
    generatedAt: new Date().toISOString(),
  };
}

function configDraftToPayload(config: WorkflowConfigDraft): WorkflowConfig {
  return {
    clientName: config.clientName,
    reportDate: config.reportDate,
    dryRun: config.dryRun,
    includeArtifacts: config.includeArtifacts,
    priority: config.priority,
    retryLimit: config.retryLimit,
    notes: config.notes,
  };
}

export default function Dashboard() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningWorkflowId, setRunningWorkflowId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'workflows' | 'executions'>('workflows');
  const [configuredWorkflow, setConfiguredWorkflow] = useState<Workflow | null>(null);
  const [configDraft, setConfigDraft] = useState<WorkflowConfigDraft>(defaultWorkflowConfig);
  const [artifactSource, setArtifactSource] = useState<
    { kind: 'execution'; artifact: ExecutionArtifact } | { kind: 'webhook'; response: TriggerWorkflowResponse } | null
  >(null);

  const stats = useMemo(() => {
    const complete = executions.filter(execution => execution.status === 'success').length;
    const failed = executions.filter(execution => ['error', 'crashed'].includes(execution.status)).length;
    const running = executions.filter(execution => !execution.finished).length;
    return { complete, failed, running };
  }, [executions]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [fetchedWorkflows, fetchedExecutions] = await Promise.all([getWorkflows(), getExecutions(15)]);
      const workflowMap = new Map(fetchedWorkflows.map(workflow => [workflow.id, workflow.name]));
      setWorkflows(fetchedWorkflows);
      setExecutions(
        fetchedExecutions.map(execution => ({
          ...execution,
          workflowName: workflowMap.get(execution.workflowId) ?? execution.workflowId.slice(0, 8),
        })),
      );
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const handleToggle = async (workflow: Workflow) => {
    try {
      setError(null);
      await toggleWorkflow(workflow.id, workflow.active);
      await fetchData();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Workflow state change failed');
    }
  };

  const openConfig = (workflow: Workflow) => {
    setConfiguredWorkflow(workflow);
    setConfigDraft({
      ...defaultWorkflowConfig,
      clientName: workflow.name,
    });
  };

  const runWithConfig = async (workflow: Workflow, config: WorkflowConfig) => {
    setRunningWorkflowId(workflow.id);
    setError(null);
    try {
      const response = await triggerWorkflowWithConfig(getWebhookName(workflow), config);
      const executionId = response.executionId ?? response.id;
      if (executionId) {
        const execution = await pollExecution(executionId);
        setArtifactSource({ kind: 'execution', artifact: buildExecutionArtifact({ ...execution, workflowName: workflow.name }) });
      } else {
        setArtifactSource({ kind: 'webhook', response });
      }
      setConfiguredWorkflow(null);
      await fetchData();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Configured workflow run failed');
    } finally {
      setRunningWorkflowId(null);
    }
  };

  if (loading) {
    return (
      <section className="dashboard-loading" aria-live="polite">
        <span />
        <strong>Reading n8n state</strong>
      </section>
    );
  }

  return (
    <>
      <section className="ops-strip" aria-label="Dashboard summary">
        <div>
          <span>{workflows.length}</span>
          <small>workflows</small>
        </div>
        <div>
          <span>{stats.complete}</span>
          <small>successful</small>
        </div>
        <div>
          <span>{stats.running}</span>
          <small>running</small>
        </div>
        <div>
          <span>{stats.failed}</span>
          <small>failed</small>
        </div>
      </section>

      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void fetchData()}>
            Retry
          </button>
        </div>
      )}

      <section className="workbench">
        <div className="primary-panel">
          <div className="panel-toolbar">
            <div className="tabs" role="tablist" aria-label="Dashboard views">
              <button
                type="button"
                className={activeTab === 'workflows' ? 'tab-active' : ''}
                onClick={() => setActiveTab('workflows')}
              >
                Workflows ({workflows.length})
              </button>
              <button
                type="button"
                className={activeTab === 'executions' ? 'tab-active' : ''}
                onClick={() => setActiveTab('executions')}
              >
                Executions ({executions.length})
              </button>
            </div>
            <button type="button" className="button button-secondary" onClick={() => void fetchData()}>
              Refresh
            </button>
          </div>

          {activeTab === 'workflows' && (
            <div className="workflow-list">
              {workflows.length === 0 ? (
                <div className="empty-state">No workflows returned from n8n.</div>
              ) : (
                workflows.map(workflow => (
                  <article key={workflow.id} className="workflow-row">
                    <div>
                      <div className="workflow-title">
                        <span className={workflow.active ? 'dot dot-live' : 'dot'} />
                        <h2>{workflow.name}</h2>
                      </div>
                      <p>
                        {workflow.active ? 'Active' : 'Inactive'} · Webhook name: {getWebhookName(workflow)} · Updated{' '}
                        {formatDate(workflow.updatedAt)}
                      </p>
                      {workflow.tags.length > 0 && (
                        <div className="tag-row">
                          {workflow.tags.map(tag => (
                            <span key={tag.id}>{tag.name}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="row-actions">
                      <button type="button" className="button button-secondary" onClick={() => openConfig(workflow)}>
                        Configure
                      </button>
                      <button
                        type="button"
                        className="button button-primary"
                        disabled={runningWorkflowId === workflow.id}
                        onClick={() => void runWithConfig(workflow, configDraftToPayload(defaultWorkflowConfig))}
                      >
                        {runningWorkflowId === workflow.id ? 'Running' : 'Run with params'}
                      </button>
                      <button type="button" className="button button-quiet" onClick={() => void handleToggle(workflow)}>
                        {workflow.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          )}

          {activeTab === 'executions' && (
            <div className="execution-table-wrap">
              {executions.length === 0 ? (
                <div className="empty-state">No executions returned from n8n.</div>
              ) : (
                <table className="execution-table">
                  <thead>
                    <tr>
                      <th>Workflow</th>
                      <th>Status</th>
                      <th>Mode</th>
                      <th>Started</th>
                      <th>Duration</th>
                      <th>Artifact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {executions.map(execution => {
                      const duration = execution.stoppedAt
                        ? Math.round((new Date(execution.stoppedAt).getTime() - new Date(execution.startedAt).getTime()) / 1000)
                        : null;
                      return (
                        <tr key={execution.id}>
                          <td>{execution.workflowName}</td>
                          <td>
                            <span className={statusClass(execution.status)}>{execution.status}</span>
                          </td>
                          <td>{execution.mode}</td>
                          <td>{formatDate(execution.startedAt)}</td>
                          <td>{duration !== null ? `${duration}s` : 'open'}</td>
                          <td>
                            <button
                              type="button"
                              className="text-button"
                              onClick={() => setArtifactSource({ kind: 'execution', artifact: buildExecutionArtifact(execution) })}
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        <ArtifactViewer source={artifactSource} />
      </section>

      <WorkflowConfigModal
        workflowName={configuredWorkflow?.name ?? ''}
        open={configuredWorkflow !== null}
        value={configDraft}
        running={runningWorkflowId !== null}
        onChange={setConfigDraft}
        onClose={() => setConfiguredWorkflow(null)}
        onRun={config => {
          if (configuredWorkflow) void runWithConfig(configuredWorkflow, config);
        }}
      />
    </>
  );
}
