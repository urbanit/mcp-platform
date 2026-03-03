import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { loadConfig } from './config/loader.js';
import { McpManager } from './mcp/manager.js';
import { ClaudeAdapter } from './llm/claude.js';
import { CopilotAdapter } from './llm/copilot.js';
import { createRouter } from './api/routes.js';
import { attachWebSocket } from './api/websocket.js';
import type { ILlmAdapter } from './llm/types.js';

// Initialise MCP manager from initial config
const initConfig = await loadConfig();
const mcpManager = new McpManager();
await mcpManager.init(initConfig.mcpServers);
console.log('[backend] MCP manager ready');

// Re-reads config file every call so PUT /api/config takes effect immediately
async function getAdapter(): Promise<ILlmAdapter> {
  const config = await loadConfig();
  const active = config.llm.active;
  const provider = config.llm.providers[active];
  if (!provider) throw new Error(`Unknown LLM provider: ${active}`);

  if (provider.type === 'claude') {
    return new ClaudeAdapter(provider.model, provider.maxTokens ?? 4096);
  }
  if (provider.type === 'copilot') {
    return new CopilotAdapter(provider.model, provider.baseUrl ?? 'https://api.githubcopilot.com');
  }
  throw new Error(`Unsupported LLM type: ${provider.type}`);
}

const app = express();

// CORS — allow direct API access during development
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
app.options('/{*path}', (_req, res) => { res.sendStatus(200); });

app.use(express.json());
app.use(createRouter(mcpManager));

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
attachWebSocket(wss, mcpManager, getAdapter);

httpServer.listen(4000, () => console.log('[backend] Listening on :4000'));
