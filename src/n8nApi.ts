/** n8n API Key — stored in .env, never commit real keys */
const N8N_API_KEY = import.meta.env.VITE_N8N_API_KEY || '';
const N8N_BASE_URL = import.meta.env.VITE_N8N_BASE_URL || 'https://n8n.ghomelab.cc';

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${N8N_BASE_URL}/api/v1${path}`, {
    ...options,
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
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
  const res = await api<ExecutionListResponse>(`/executions?limit=${limit}&orderBy=startedAt:desc`);
  return res.data || [];
}

/** Get executions for a specific workflow */
export async function getWorkflowExecutions(workflowId: string, limit = 10): Promise<Execution[]> {
  const res = await api<ExecutionListResponse>(
    `/executions?limit=${limit}&workflowId=${workflowId}&orderBy=startedAt:desc`
  );
  return res.data || [];
}

/** Delete an execution */
export async function deleteExecution(id: string): Promise<void> {
  await api(`/executions/${id}`, { method: 'DELETE' });
}
