import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

const app = express();
app.use(express.json());

const NumberPair = { a: z.number(), b: z.number() };

function createServer() {
  const mcpServer = new McpServer({ name: 'calculator', version: '1.0.0' });

  mcpServer.tool('add', 'Add two numbers', NumberPair, async ({ a, b }) => ({
    content: [{ type: 'text', text: String(a + b) }],
  }));

  mcpServer.tool('subtract', 'Subtract b from a', NumberPair, async ({ a, b }) => ({
    content: [{ type: 'text', text: String(a - b) }],
  }));

  mcpServer.tool('multiply', 'Multiply two numbers', NumberPair, async ({ a, b }) => ({
    content: [{ type: 'text', text: String(a * b) }],
  }));

  mcpServer.tool('divide', 'Divide a by b', NumberPair, async ({ a, b }) => {
    if (b === 0) return { content: [{ type: 'text', text: 'Error: division by zero' }], isError: true };
    return { content: [{ type: 'text', text: String(a / b) }] };
  });

  mcpServer.tool(
    'power',
    'Raise a to the power of b',
    NumberPair,
    async ({ a, b }) => ({ content: [{ type: 'text', text: String(Math.pow(a, b)) }] }),
  );

  return mcpServer;
}

// Stateless: new transport + server instance per request
app.post('/mcp', async (req, res) => {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on('close', () => transport.close());
  const server = createServer();
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.get('/mcp', async (req, res) => {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on('close', () => transport.close());
  const server = createServer();
  await server.connect(transport);
  await transport.handleRequest(req, res);
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(3001, () => console.log('Calculator MCP server listening on :3001'));
