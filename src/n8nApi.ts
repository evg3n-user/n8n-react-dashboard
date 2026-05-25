/** Base path for n8n API — proxied through backend */
const N8N_BASE = '/api/n8n';

export type WorkflowConfigValue = string | number | boolean;
export type WorkflowConfig = Record<string, WorkflowConfigValue>;
export type ArtifactFormat = 'pdf' | 'csv' | 'json';

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${N8N_BASE}${path}`, {
    ...options,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `API error ${res.status}`);
  }
  return res.json();
}

/** n8n Workflow types */
export interface Workflow {
  id: string;
  name: string;
  active: boolean;
  tags: { id: string; name: string }[];
  updatedAt: string;
  versionId: string;
}

export interface Execution {
  id: string;
  finished: boolean;
  mode: 'webhook' | 'manual' | 'trigger' | string;
  retryOf: string | null;
  retrySuccessId: string | null;
  startedAt: string;
  stoppedAt: string | null;
  workflowId: string;
  status: 'success' | 'error' | 'running' | 'waiting' | string;
  workflowName?: string;
}

export interface TriggerWorkflowResponse {
  executionId?: string;
  id?: string;
  status?: string;
  data?: unknown;
  message?: string;
  submittedAt: string;
  webhookName: string;
  config: WorkflowConfig;
}

export interface ExecutionArtifact {
  executionId: string;
  status: string;
  finished: boolean;
  startedAt?: string;
  stoppedAt?: string | null;
  workflowId?: string;
  workflowName?: string;
  result: unknown;
  generatedAt: string;
}

export interface TriggerInfo {
  type: 'webhook' | 'schedule' | 'manual' | 'form' | 'chat' | 'trigger' | 'none' | 'unknown';
  nodeName: string | null;
  webhookPath: string | null;
  httpMethod: string;
  rawType: string;
}

export interface WorkflowListResponse {
  data: Workflow[];
  count?: number;
}

export interface ExecutionListResponse {
  data: Execution[];
  count?: number;
}

/** Fetch all workflows */
export async function getWorkflows(): Promise<Workflow[]> {
  const res = await api<WorkflowListResponse>('/workflows?limit=20');
  return res.data || [];
}

/** Trigger a workflow by webhook */
export async function triggerWorkflow(id: string): Promise<void> {
  await api(`/workflows/${id}/activate`, { method: 'POST' });
}

/** Deactivate a workflow */
export async function deactivateWorkflow(id: string): Promise<void> {
  await api(`/workflows/${id}/deactivate`, { method: 'POST' });
}

/** Toggle workflow active state */
export async function toggleWorkflow(id: string, active: boolean): Promise<void> {
  if (active) {
    await deactivateWorkflow(id);
  } else {
    await triggerWorkflow(id);
  }
}

/** Fetch recent executions */
export async function getExecutions(limit = 20): Promise<Execution[]> {
  const res = await api<ExecutionListResponse>(`/executions?limit=${limit}`);
  return res.data || [];
}

/** Get executions for a specific workflow */
export async function getWorkflowExecutions(workflowId: string, limit = 10): Promise<Execution[]> {
  const res = await api<ExecutionListResponse>(
    `/executions?limit=${limit}&workflowId=${workflowId}`
  );
  return res.data || [];
}

/** Delete an execution */
export async function deleteExecution(id: string): Promise<void> {
  await api(`/executions/${id}`, { method: 'DELETE' });
}

/** Trigger a workflow through a named webhook with runtime configuration */
export async function triggerWorkflowWithConfig(
  webhookName: string,
  config: WorkflowConfig,
): Promise<TriggerWorkflowResponse> {
  return api<TriggerWorkflowResponse>(`/webhook/${encodeURIComponent(webhookName)}`, {
    method: 'POST',
    body: JSON.stringify({ config }),
  });
}

/** Poll a single execution until it reaches a terminal state or times out */
export async function pollExecution(
  executionId: string,
  options: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<Execution> {
  const intervalMs = options.intervalMs ?? 1500;
  const timeoutMs = options.timeoutMs ?? 30000;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const execution = await api<Execution>(`/executions/${executionId}`);
    if (execution.finished || ['success', 'error', 'canceled', 'crashed'].includes(execution.status)) {
      return execution;
    }
    await new Promise(resolve => window.setTimeout(resolve, intervalMs));
  }

  return api<Execution>(`/executions/${executionId}`);
}

/** Detect the first trigger node type in a workflow */
export async function getTriggerInfo(workflowId: string): Promise<TriggerInfo> {
  return api<TriggerInfo>(`/workflows/${encodeURIComponent(workflowId)}/trigger-info`);
}

/** Download an execution artifact in a supported format */
export async function getArtifact(executionId: string, format: ArtifactFormat): Promise<Blob> {
  const res = await fetch(`${N8N_BASE}/executions/${encodeURIComponent(executionId)}/artifact?format=${format}`, {
    headers: { Accept: format === 'json' ? 'application/json' : '*/*' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText })) as { message?: string };
    throw new Error(err.message || `API error ${res.status}`);
  }
  return res.blob();
}
