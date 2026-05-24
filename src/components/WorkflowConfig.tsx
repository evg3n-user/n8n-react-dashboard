import type { FormEvent } from 'react';
import type { WorkflowConfig } from '../n8nApi';

export interface WorkflowConfigDraft {
  clientName: string;
  reportDate: string;
  dryRun: boolean;
  includeArtifacts: boolean;
  priority: number;
  retryLimit: number;
  notes: string;
}

interface WorkflowConfigProps {
  workflowName: string;
  open: boolean;
  value: WorkflowConfigDraft;
  running: boolean;
  onChange: (value: WorkflowConfigDraft) => void;
  onClose: () => void;
  onRun: (config: WorkflowConfig) => void;
}

export const defaultWorkflowConfig: WorkflowConfigDraft = {
  clientName: '',
  reportDate: new Date().toISOString().slice(0, 10),
  dryRun: true,
  includeArtifacts: true,
  priority: 5,
  retryLimit: 2,
  notes: '',
};

function toWorkflowConfig(value: WorkflowConfigDraft): WorkflowConfig {
  return {
    clientName: value.clientName,
    reportDate: value.reportDate,
    dryRun: value.dryRun,
    includeArtifacts: value.includeArtifacts,
    priority: value.priority,
    retryLimit: value.retryLimit,
    notes: value.notes,
  };
}

export default function WorkflowConfigModal({
  workflowName,
  open,
  value,
  running,
  onChange,
  onClose,
  onRun,
}: WorkflowConfigProps) {
  if (!open) return null;

  const update = <K extends keyof WorkflowConfigDraft>(key: K, nextValue: WorkflowConfigDraft[K]) => {
    onChange({ ...value, [key]: nextValue });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onRun(toWorkflowConfig(value));
  };

  return (
    <div className="modal-shell" role="dialog" aria-modal="true" aria-labelledby="workflow-config-title">
      <div className="modal-panel">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Runtime contract</p>
            <h2 id="workflow-config-title">Configure {workflowName}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close configuration">
            X
          </button>
        </div>

        <form className="config-form" onSubmit={submit}>
          <label className="field field-wide">
            <span>Client or payload label</span>
            <input
              value={value.clientName}
              onChange={event => update('clientName', event.target.value)}
              placeholder="Acme ops packet"
              required
            />
          </label>

          <label className="field">
            <span>Report date</span>
            <input
              type="date"
              value={value.reportDate}
              onChange={event => update('reportDate', event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span>Priority</span>
            <input
              type="number"
              min={1}
              max={10}
              value={value.priority}
              onChange={event => update('priority', Number(event.target.value))}
            />
          </label>

          <label className="field">
            <span>Retry limit</span>
            <input
              type="number"
              min={0}
              max={12}
              value={value.retryLimit}
              onChange={event => update('retryLimit', Number(event.target.value))}
            />
          </label>

          <label className="toggle-row">
            <input
              type="checkbox"
              checked={value.dryRun}
              onChange={event => update('dryRun', event.target.checked)}
            />
            <span>
              <strong>Dry run</strong>
              <small>Validate the route before committing downstream changes.</small>
            </span>
          </label>

          <label className="toggle-row">
            <input
              type="checkbox"
              checked={value.includeArtifacts}
              onChange={event => update('includeArtifacts', event.target.checked)}
            />
            <span>
              <strong>Generate artifacts</strong>
              <small>Ask the workflow to return exportable result payloads.</small>
            </span>
          </label>

          <label className="field field-wide">
            <span>Run notes</span>
            <textarea
              value={value.notes}
              onChange={event => update('notes', event.target.value)}
              rows={4}
              placeholder="Context, filters, identifiers, or routing notes"
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="button button-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="button button-primary" disabled={running}>
              {running ? 'Running' : 'Run with params'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
