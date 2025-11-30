import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Hono } from 'hono';
import { z } from 'zod';
import { mastra } from './mastra';

type ValidationResult<T> = { success: true; data: T } | { success: false; error: string };

const agentRequestSchema = z.object({
  message: z.string().min(1, 'Message is required'),
});

const workflowRequestSchema = z.object({
  city: z.string().min(1, 'City is required'),
});

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
};

const parseRequestBody = async <T>(schema: z.ZodSchema<T>, request: Request): Promise<ValidationResult<T>> => {
  try {
    const json = await request.json();
    const parsed = schema.safeParse(json);

    if (!parsed.success) {
      return { success: false, error: parsed.error.errors.map((issue) => issue.message).join(', ') };
    }

    return { success: true, data: parsed.data };
  } catch {
    return { success: false, error: 'Invalid JSON payload' };
  }
};

const app = new Hono();

app.post('/agents/weather', async (c) => {
  const parsed = await parseRequestBody(agentRequestSchema, c.req.raw);

  if (!parsed.success) {
    return c.json({ error: parsed.error }, 400);
  }

  try {
    const response = await mastra.agents.weatherAgent.stream([
      {
        role: 'user',
        content: parsed.data.message,
      },
    ]);

    let content = '';

    for await (const chunk of response.textStream) {
      content += chunk;
    }

    return c.json({ reply: content });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

app.post('/workflows/weather', async (c) => {
  const parsed = await parseRequestBody(workflowRequestSchema, c.req.raw);

  if (!parsed.success) {
    return c.json({ error: parsed.error }, 400);
  }

  try {
    const workflowRun = mastra.workflows.weatherWorkflow.createRun();
    const result = await workflowRun.start({
      triggerData: { city: parsed.data.city },
    });

    const activePaths = Array.from(result.activePaths.entries()).map(([stepId, value]) => ({
      stepId,
      status: value.status,
      suspendPayload: value.suspendPayload,
      stepPath: value.stepPath,
    }));

    return c.json({
      runId: workflowRun.runId,
      results: result.results,
      activePaths,
      timestamp: result.timestamp,
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

const buildRequestHeaders = (incomingMessage: IncomingMessage): Headers => {
  const headers = new Headers();

  Object.entries(incomingMessage.headers).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => headers.append(key, item));
      return;
    }

    headers.set(key, value);
  });

  return headers;
};

const createFetchRequest = (req: IncomingMessage, port: number): Request => {
  const host = req.headers.host ?? `localhost:${port}`;
  const url = new URL(req.url ?? '/', `http://${host}`);
  const headers = buildRequestHeaders(req);
  const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : req;

  return new Request(url, {
    method: req.method,
    headers,
    body,
  });
};

const handleResponse = async (appResponse: Response, res: ServerResponse): Promise<void> => {
  res.statusCode = appResponse.status;

  appResponse.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  const buffer = Buffer.from(await appResponse.arrayBuffer());
  res.end(buffer);
};

const port = Number(process.env.PORT ?? 3000);

createServer(async (req, res) => {
  if (!req.url || !req.method) {
    res.statusCode = 400;
    res.end('Bad Request');
    return;
  }

  try {
    const request = createFetchRequest(req, port);
    const appResponse = await app.fetch(request);
    await handleResponse(appResponse, res);
  } catch (error) {
    res.statusCode = 500;
    res.end(getErrorMessage(error));
  }
}).listen(port, () => {
  console.log(`Hono server listening on port ${port}`);
});

export { app };
