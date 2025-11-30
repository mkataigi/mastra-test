/// <reference path="../types/mastra-output.d.ts" />
import { RuntimeContext } from '@mastra/core/di';
import { agents, workflows } from '@mastra/server/handlers';
import { Context, Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { handle } from 'hono/vercel';

// @ts-expect-error Generated during build; declarations are provided in ../types/mastra-output.d.ts.
import { mastra } from '../.mastra/output/mastra.mjs';

const app = new Hono();

const jsonError = (context: Context, error: unknown, message: string) => {
  const status = error instanceof Error && 'status' in error
    ? (Number((error as Error & { status?: number }).status) as ContentfulStatusCode)
    : (500 as ContentfulStatusCode);
  const responseMessage = error instanceof Error && error.message ? error.message : message;
  return context.json({ error: responseMessage }, status);
};

app.get('/api', (c) => c.json({ status: 'ok' }));

app.get('/api/agents', async (c) => {
  try {
    const agentList = await agents.getAgentsHandler({ mastra });
    return c.json(agentList);
  } catch (error) {
    return jsonError(c, error, 'Failed to load agents');
  }
});

app.get('/api/agents/:agentId', async (c) => {
  try {
    const agentId = c.req.param('agentId');
    const agent = await agents.getAgentByIdHandler({ mastra, agentId });
    return c.json(agent);
  } catch (error) {
    return jsonError(c, error, 'Failed to load agent');
  }
});

app.post('/api/agents/:agentId/generate', async (c) => {
  try {
    const agentId = c.req.param('agentId');
    const runtimeContext = new RuntimeContext();
    const body = await c.req.json();
    const result = await agents.generateHandler({
      mastra,
      runtimeContext,
      agentId,
      body,
    });
    return c.json(result);
  } catch (error) {
    return jsonError(c, error, 'Failed to generate response');
  }
});

app.get('/api/workflows', async (c) => {
  try {
    const workflowList = await workflows.getWorkflowsHandler({ mastra });
    return c.json(workflowList);
  } catch (error) {
    return jsonError(c, error, 'Failed to load workflows');
  }
});

app.get('/api/workflows/:workflowId', async (c) => {
  try {
    const workflowId = c.req.param('workflowId');
    const workflow = await workflows.getWorkflowByIdHandler({ mastra, workflowId });
    return c.json(workflow);
  } catch (error) {
    return jsonError(c, error, 'Failed to load workflow');
  }
});

app.post('/api/workflows/:workflowId/run', async (c) => {
  try {
    const workflowId = c.req.param('workflowId');
    const runtimeContext = new RuntimeContext();
    const triggerData = await c.req.json();
    const runResult = await workflows.startAsyncWorkflowHandler({
      mastra,
      runtimeContext,
      workflowId,
      triggerData,
    });
    return c.json(runResult);
  } catch (error) {
    return jsonError(c, error, 'Failed to run workflow');
  }
});

export const config = {
  runtime: 'nodejs20.x',
};

export default handle(app);
