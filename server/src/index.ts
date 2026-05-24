import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';

const N8N_API_KEY = process.env.N8N_API_KEY || '';
const N8N_BASE_URL = process.env.N8N_BASE_URL || 'https://n8n.ghomelab.cc';
const PORT = parseInt(process.env.PORT || '3001', 10);

const server = Fastify({ logger: true });
type JsonRecord = Record<string, unknown>;

await server.register(cors, {
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
});

// Allow empty JSON body for activate/deactivate POST requests
server.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
  try {
    const rawBody = typeof body === 'string' ? body : body.toString();
    done(null, rawBody === '' ? {} : JSON.parse(rawBody));
  } catch (err) {
    done(err as Error, undefined);
  }
});

async function proxyToN8n(
  n8nPath: string,
  method: string,
  body?: unknown,
  query?: Record<string, string>,
): Promise<Response> {
  const url = new URL(`/api/v1${n8nPath}`, N8N_BASE_URL);
  if (query) {
    Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const headers: Record<string, string> = {
    'X-N8N-API-KEY': N8N_API_KEY,
    Accept: 'application/json',
  };

  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  return fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function proxyToN8nWebhook(name: string, body: unknown): Promise<Response> {
  const url = new URL(`/webhook/${encodeURIComponent(name)}`, N8N_BASE_URL);

  return fetch(url.toString(), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body ?? {}),
  });
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function parseResponse(res: Response): Promise<unknown> {
  if (res.status === 204) return null;
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

function extractExecutionId(value: unknown): string | undefined {
  if (!isJsonRecord(value)) return undefined;
  const candidates = [value.executionId, value.id];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.length > 0) return candidate;
    if (typeof candidate === 'number') return String(candidate);
  }
  if (isJsonRecord(value.data)) return extractExecutionId(value.data);
  return undefined;
}

function jsonToCsv(value: unknown): string {
  const rows = Array.isArray(value) ? value : [value];
  const records: JsonRecord[] = rows.map(row => (isJsonRecord(row) ? row : { value: row }));
  const headers = Array.from(new Set(records.flatMap(record => Object.keys(record))));
  const escapeCell = (cell: unknown) => {
    const text = typeof cell === 'string' ? cell : JSON.stringify(cell ?? '');
    return `"${text.replaceAll('"', '""')}"`;
  };
  return [headers.join(','), ...records.map(record => headers.map(header => escapeCell(record[header])).join(','))].join('\n');
}

function jsonToPdfBuffer(value: unknown): Buffer {
  const text = JSON.stringify(value, null, 2).replace(/[()\\]/g, match => `\\${match}`);
  const lines = text.split('\n').slice(0, 42);
  const stream = [
    'BT',
    '/F1 10 Tf',
    '40 790 Td',
    '(n8n execution artifact) Tj',
    ...lines.map(line => `0 -14 Td (${line.slice(0, 90)}) Tj`),
    'ET',
  ].join('\n');
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Courier >> endobj',
    `5 0 obj << /Length ${Buffer.byteLength(stream)} >> stream\n${stream}\nendstream endobj`,
  ];
  const chunks = ['%PDF-1.4\n'];
  const offsets: number[] = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(chunks.join('')));
    chunks.push(`${object}\n`);
  }
  const xrefOffset = Buffer.byteLength(chunks.join(''));
  chunks.push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  offsets.slice(1).forEach(offset => chunks.push(`${String(offset).padStart(10, '0')} 00000 n \n`));
  chunks.push(`trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  return Buffer.from(chunks.join(''));
}

function toN8nError(err: unknown): { status: number; message: string } {
  if (err instanceof Error) {
    if ('cause' in err && (err.cause as Error)?.message) {
      return { status: 502, message: `n8n unreachable: ${(err.cause as Error).message}` };
    }
    return { status: 502, message: `n8n unreachable: ${err.message}` };
  }
  return { status: 502, message: 'n8n unreachable' };
}

// GET /api/n8n/workflows
server.get('/api/n8n/workflows', async (request, reply) => {
  try {
    const query = request.query as Record<string, string>;
    const res = await proxyToN8n('/workflows', 'GET', undefined, query);
    const data = await res.json();
    return reply.status(res.status).send(data);
  } catch (err) {
    const e = toN8nError(err);
    return reply.status(e.status).send({ message: e.message });
  }
});

// POST /api/n8n/webhook/:name
server.post<{ Params: { name: string }; Body: unknown }>(
  '/api/n8n/webhook/:name',
  async (request, reply) => {
    try {
      const res = await proxyToN8nWebhook(request.params.name, request.body);
      const data = await parseResponse(res);
      const executionId = extractExecutionId(data);
      return reply.status(res.status).send({
        executionId,
        id: executionId,
        status: res.ok ? 'submitted' : 'error',
        data,
        submittedAt: new Date().toISOString(),
        webhookName: request.params.name,
        config: isJsonRecord(request.body) && isJsonRecord(request.body.config) ? request.body.config : {},
      });
    } catch (err) {
      const e = toN8nError(err);
      return reply.status(e.status).send({ message: e.message });
    }
  },
);

// GET /api/n8n/workflows/:id
server.get<{ Params: { id: string } }>('/api/n8n/workflows/:id', async (request, reply) => {
  try {
    const res = await proxyToN8n(`/workflows/${request.params.id}`, 'GET');
    const data = res.status === 204 ? null : await res.json();
    return reply.status(res.status).send(data);
  } catch (err) {
    const e = toN8nError(err);
    return reply.status(e.status).send({ message: e.message });
  }
});

// POST /api/n8n/workflows/:id/activate
server.post<{ Params: { id: string } }>(
  '/api/n8n/workflows/:id/activate',
  async (request, reply) => {
    try {
      const res = await proxyToN8n(`/workflows/${request.params.id}/activate`, 'POST', {});
      const data = res.status === 204 ? null : await res.json();
      return reply.status(res.status).send(data);
    } catch (err) {
      const e = toN8nError(err);
      return reply.status(e.status).send({ message: e.message });
    }
  },
);

// POST /api/n8n/workflows/:id/deactivate
server.post<{ Params: { id: string } }>(
  '/api/n8n/workflows/:id/deactivate',
  async (request, reply) => {
    try {
      const res = await proxyToN8n(`/workflows/${request.params.id}/deactivate`, 'POST', {});
      const data = res.status === 204 ? null : await res.json();
      return reply.status(res.status).send(data);
    } catch (err) {
      const e = toN8nError(err);
      return reply.status(e.status).send({ message: e.message });
    }
  },
);

// GET /api/n8n/executions
server.get('/api/n8n/executions', async (request, reply) => {
  try {
    const query = request.query as Record<string, string>;
    const res = await proxyToN8n('/executions', 'GET', undefined, query);
    const data = await res.json();
    return reply.status(res.status).send(data);
  } catch (err) {
    const e = toN8nError(err);
    return reply.status(e.status).send({ message: e.message });
  }
});

// GET /api/n8n/executions/:id
server.get<{ Params: { id: string } }>('/api/n8n/executions/:id', async (request, reply) => {
  try {
    const res = await proxyToN8n(`/executions/${request.params.id}`, 'GET');
    const data = await parseResponse(res);
    return reply.status(res.status).send(data);
  } catch (err) {
    const e = toN8nError(err);
    return reply.status(e.status).send({ message: e.message });
  }
});

// GET /api/n8n/executions/:id/artifact
server.get<{ Params: { id: string }; Querystring: { format?: 'pdf' | 'csv' | 'json' } }>(
  '/api/n8n/executions/:id/artifact',
  async (request, reply) => {
    try {
      const format = request.query.format ?? 'json';
      const res = await proxyToN8n(`/executions/${request.params.id}`, 'GET');
      const data = await parseResponse(res);

      if (!res.ok) {
        return reply.status(res.status).send(data);
      }

      if (format === 'csv') {
        return reply
          .header('Content-Type', 'text/csv; charset=utf-8')
          .header('Content-Disposition', `attachment; filename="n8n-${request.params.id}.csv"`)
          .send(jsonToCsv(data));
      }

      if (format === 'pdf') {
        return reply
          .header('Content-Type', 'application/pdf')
          .header('Content-Disposition', `attachment; filename="n8n-${request.params.id}.pdf"`)
          .send(jsonToPdfBuffer(data));
      }

      return reply
        .header('Content-Disposition', `attachment; filename="n8n-${request.params.id}.json"`)
        .send({
          executionId: request.params.id,
          result: data,
          generatedAt: new Date().toISOString(),
        });
    } catch (err) {
      const e = toN8nError(err);
      return reply.status(e.status).send({ message: e.message });
    }
  },
);

// DELETE /api/n8n/executions/:id
server.delete<{ Params: { id: string } }>(
  '/api/n8n/executions/:id',
  async (request, reply) => {
    try {
      const res = await proxyToN8n(`/executions/${request.params.id}`, 'DELETE');
      const data = res.status === 204 ? null : await res.json();
      return reply.status(res.status).send(data);
    } catch (err) {
      const e = toN8nError(err);
      return reply.status(e.status).send({ message: e.message });
    }
  },
);

// Health check
server.get('/api/health', async () => ({ status: 'ok' }));

try {
  await server.listen({ port: PORT, host: '0.0.0.0' });
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
