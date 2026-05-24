import { useMemo, useState } from 'react';
import { getArtifact } from '../n8nApi';
import type { ArtifactFormat, ExecutionArtifact, TriggerWorkflowResponse } from '../n8nApi';

type ArtifactSource =
  | { kind: 'execution'; artifact: ExecutionArtifact }
  | { kind: 'webhook'; response: TriggerWorkflowResponse };

interface ArtifactViewerProps {
  source: ArtifactSource | null;
}

function stringifyResult(value: unknown): string {
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

function getSourceMeta(source: ArtifactSource) {
  if (source.kind === 'execution') {
    return {
      executionId: source.artifact.executionId,
      status: source.artifact.status,
      generatedAt: source.artifact.generatedAt,
      result: source.artifact.result,
    };
  }

  return {
    executionId: source.response.executionId ?? source.response.id ?? 'webhook-response',
    status: source.response.status ?? 'submitted',
    generatedAt: source.response.submittedAt,
    result: source.response.data ?? source.response,
  };
}

export default function ArtifactViewer({ source }: ArtifactViewerProps) {
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const meta = useMemo(() => (source ? getSourceMeta(source) : null), [source]);

  if (!source || !meta) {
    return (
      <section className="artifact-panel artifact-empty" aria-label="Execution artifacts">
        <p className="eyebrow">Artifact bay</p>
        <h2>No execution selected</h2>
        <p>Run a configured workflow or select a recent execution to inspect the returned payload.</p>
      </section>
    );
  }

  const download = async (format: ArtifactFormat) => {
    setDownloadError(null);
    try {
      let blob: Blob;
      if (source.kind === 'execution') {
        blob = await getArtifact(source.artifact.executionId, format);
      } else {
        const body = format === 'json' ? stringifyResult(meta.result) : stringifyResult(meta.result);
        const mime = format === 'json' ? 'application/json' : format === 'csv' ? 'text/csv' : 'application/pdf';
        blob = new Blob([body], { type: mime });
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `n8n-${meta.executionId}.${format}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'Artifact download failed');
    }
  };

  return (
    <section className="artifact-panel" aria-label="Execution artifacts">
      <div className="artifact-head">
        <div>
          <p className="eyebrow">Execution artifact</p>
          <h2>{meta.executionId}</h2>
        </div>
        <span className="status-stamp">{meta.status}</span>
      </div>

      <div className="artifact-actions" aria-label="Download artifact">
        <button type="button" className="button button-secondary" onClick={() => void download('pdf')}>
          PDF
        </button>
        <button type="button" className="button button-secondary" onClick={() => void download('csv')}>
          CSV
        </button>
        <button type="button" className="button button-primary" onClick={() => void download('json')}>
          JSON
        </button>
      </div>

      {downloadError && <p className="error-line">{downloadError}</p>}

      <dl className="artifact-meta">
        <div>
          <dt>Generated</dt>
          <dd>{new Date(meta.generatedAt).toLocaleString()}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{source.kind}</dd>
        </div>
      </dl>

      <pre className="artifact-code">{stringifyResult(meta.result)}</pre>
    </section>
  );
}
