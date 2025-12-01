import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Readable } from 'stream';
import { Hono } from 'hono';
import { z } from 'zod';
import { mastra } from './mastra';

type ValidationResult<T> = { success: true; data: T } | { success: false; error: string };

type AgentRequestBody = z.infer<typeof agentRequestSchema>;
type WorkflowRequestBody = z.infer<typeof workflowRequestSchema>;

type ActivePathValue = { status: string; suspendPayload?: unknown; stepPath?: string[] };

type ActivePathEntry = {
  stepId: string;
  status: string;
  suspendPayload?: unknown;
  stepPath?: string[];
};

const BAD_REQUEST_STATUS = 400;
const INTERNAL_SERVER_ERROR_STATUS = 500;

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

const collectStreamText = async (stream: AsyncIterable<string>): Promise<string> => {
  let content = '';

  for await (const chunk of stream) {
    content += chunk;
  }

  return content;
};

const handleWeatherAgent = async ({ message }: AgentRequestBody) => {
  const { weatherAgent } = mastra.getAgents();
  const response = await weatherAgent.stream([
    {
      role: 'user',
      content: message,
    },
  ]);

  const content = await collectStreamText(response.textStream);

  return { reply: content };
};

const mapActivePaths = (activePaths: Map<string, ActivePathValue>): ActivePathEntry[] => {
  return Array.from(activePaths).map(([stepId, value]) => ({
    stepId,
    status: value.status,
    suspendPayload: value.suspendPayload,
    stepPath: value.stepPath,
  }));
};

const handleWeatherWorkflow = async ({ city }: WorkflowRequestBody) => {
  const { weatherWorkflow } = mastra.getWorkflows();
  const workflowRun = weatherWorkflow.createRun();
  const result = await workflowRun.start({
    triggerData: { city },
  });

  const activePaths = mapActivePaths(result.activePaths as Map<string, ActivePathValue>);

  return {
    runId: workflowRun.runId,
    results: result.results,
    activePaths,
    timestamp: result.timestamp,
  };
};

const app = new Hono();

app.post('/agents/weather', async (c) => {
  const parsed = await parseRequestBody(agentRequestSchema, c.req.raw);

  if (!parsed.success) {
    return c.json({ error: parsed.error }, BAD_REQUEST_STATUS);
  }

  try {
    const agentResponse = await handleWeatherAgent(parsed.data);
    return c.json(agentResponse);
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, INTERNAL_SERVER_ERROR_STATUS);
  }
});

app.post('/workflows/weather', async (c) => {
  const parsed = await parseRequestBody(workflowRequestSchema, c.req.raw);

  if (!parsed.success) {
    return c.json({ error: parsed.error }, BAD_REQUEST_STATUS);
  }

  try {
    const workflowResponse = await handleWeatherWorkflow(parsed.data);
    return c.json(workflowResponse);
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, INTERNAL_SERVER_ERROR_STATUS);
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
  const body =
    req.method === 'GET' || req.method === 'HEAD'
      ? undefined
      : (Readable.toWeb(req) as unknown as BodyInit);

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
    res.statusCode = BAD_REQUEST_STATUS;
    res.end('Bad Request');
    return;
  }

  try {
    const request = createFetchRequest(req, port);
    const appResponse = await app.fetch(request);
    await handleResponse(appResponse, res);
  } catch (error) {
    res.statusCode = INTERNAL_SERVER_ERROR_STATUS;
    res.end(getErrorMessage(error));
  }
}).listen(port, () => {
  console.log(`Hono server listening on port ${port}`);
});

export { app };
