import type { WebSocketServer, WebSocket } from 'ws';
import type { McpManager } from '../mcp/manager.js';
import type { ILlmAdapter, ChatMessage } from '../llm/types.js';

interface ChatRequest {
  type: 'chat';
  id: string;
  message: string;
  history: ChatMessage[];
}

function send(ws: WebSocket, payload: unknown): void {
  if (ws.readyState === 1 /* OPEN */) {
    ws.send(JSON.stringify(payload));
  }
}

export function attachWebSocket(
  wss: WebSocketServer,
  mcpManager: McpManager,
  getAdapter: () => Promise<ILlmAdapter>,
): void {
  wss.on('connection', (ws) => {
    ws.on('message', async (raw) => {
      let req: ChatRequest;
      try {
        req = JSON.parse(raw.toString()) as ChatRequest;
      } catch {
        return;
      }

      if (req.type !== 'chat') return;

      const { id, message, history } = req;
      const messages: ChatMessage[] = [...history, { role: 'user', content: message }];
      const tools = mcpManager.getTools();

      let adapter: ILlmAdapter;
      try {
        adapter = await getAdapter();
      } catch (err) {
        send(ws, { type: 'error', id, message: `Failed to load LLM adapter: ${String(err)}` });
        return;
      }

      try {
        const finalText = await adapter.chat(
          messages,
          tools,
          {
            onToken: (delta) => send(ws, { type: 'token', id, delta }),
            onToolCall: (toolName, serverId, args) =>
              send(ws, { type: 'tool_call', id, toolName, serverId, args }),
            onToolResult: (toolName, result) =>
              send(ws, { type: 'tool_result', id, toolName, result }),
          },
          (name, args) => mcpManager.callTool(name, args),
        );

        send(ws, { type: 'done', id, finalText });
      } catch (err) {
        send(ws, { type: 'error', id, message: String(err) });
      }
    });
  });
}
