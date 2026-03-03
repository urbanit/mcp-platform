export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type WsMessage =
  | { type: 'token';       id: string; delta: string }
  | { type: 'tool_call';   id: string; toolName: string; serverId: string; args: unknown }
  | { type: 'tool_result'; id: string; toolName: string; result: string }
  | { type: 'done';        id: string; finalText: string }
  | { type: 'error';       id: string; message: string };
