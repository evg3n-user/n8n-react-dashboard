/** Base path for n8n API — proxied through backend */
const N8N_BASE = '/api/n8n';

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
  mode: 'webhook' | 'manual' | 'trigger';
  retryOf: string | null;
  retrySuccessId: string | null;
  startedAt: string;
  stoppedAt: string;
  workflowId: string;
  status: 'success' | 'error' | 'running' | 'waiting';
  workflowName?: string;
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
