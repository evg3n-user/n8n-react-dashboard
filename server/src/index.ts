import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';

const N8N_API_KEY = process.env.N8N_API_KEY || '';
const N8N_BASE_URL = process.env.N8N_BASE_URL || 'https://n8n.ghomelab.cc';
const PORT = parseInt(process.env.PORT || '3001', 10);

const server = Fastify({ logger: true });

await server.register(cors, {
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
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
    const res = await proxyToN8n('/workflows', 'GET');
    const data = await res.json();
    return reply.status(res.status).send(data);
  } catch (err) {
    const e = toN8nError(err);
    return reply.status(e.status).send({ message: e.message });
  }
});

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
      const res = await proxyToN8n(`/workflows/${request.params.id}/activate`, 'POST');
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
      const res = await proxyToN8n(`/workflows/${request.params.id}/deactivate`, 'POST');
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
