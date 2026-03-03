export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface StreamCallbacks {
  onToken: (delta: string) => void;
  onToolCall: (toolName: string, serverId: string, args: unknown) => void;
  onToolResult: (toolName: string, result: string) => void;
}

export interface ILlmAdapter {
  chat(
    messages: ChatMessage[],
    tools: McpTool[],
    callbacks: StreamCallbacks,
    callTool: (name: string, args: unknown) => Promise<{ content: string; serverId: string }>,
  ): Promise<string>;
}
