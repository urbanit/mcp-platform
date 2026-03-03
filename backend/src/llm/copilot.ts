import OpenAI from 'openai';
import type { ILlmAdapter, ChatMessage, McpTool, StreamCallbacks } from './types.js';

type OpenAIMessage = OpenAI.ChatCompletionMessageParam;
type OpenAITool = OpenAI.ChatCompletionTool;

export class CopilotAdapter implements ILlmAdapter {
  private client: OpenAI;
  private model: string;

  constructor(model: string, baseUrl: string) {
    const token = process.env.GITHUB_TOKEN;
    if (!token) throw new Error('GITHUB_TOKEN env var is not set');
    this.client = new OpenAI({
      apiKey: token,
      baseURL: baseUrl,
    });
    this.model = model;
  }

  private getClient(): OpenAI {
    return this.client;
  }

  async chat(
    messages: ChatMessage[],
    tools: McpTool[],
    callbacks: StreamCallbacks,
    callTool: (name: string, args: unknown) => Promise<{ content: string; serverId: string }>,
  ): Promise<string> {
    const openAIMessages: OpenAIMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const openAITools: OpenAITool[] = tools.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema,
      },
    }));

    let finalText = '';

    // Agentic loop
    while (true) {
      const toolCalls: OpenAI.ChatCompletionMessageToolCall[] = [];
      let assistantText = '';

      const client = await this.getClient();
      const stream = await client.chat.completions.create({
        model: this.model,
        messages: openAIMessages,
        tools: openAITools.length > 0 ? openAITools : undefined,
        stream: true,
      });

      const toolCallAccum: Record<number, { id: string; name: string; args: string }> = {};

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        if (delta.content) {
          callbacks.onToken(delta.content);
          assistantText += delta.content;
        }

        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index;
            if (!toolCallAccum[idx]) {
              toolCallAccum[idx] = { id: tc.id ?? '', name: tc.function?.name ?? '', args: '' };
            }
            if (tc.id) toolCallAccum[idx].id = tc.id;
            if (tc.function?.name) toolCallAccum[idx].name = tc.function.name;
            if (tc.function?.arguments) toolCallAccum[idx].args += tc.function.arguments;
          }
        }
      }

      finalText += assistantText;

      // Convert accumulated tool calls
      for (const accum of Object.values(toolCallAccum)) {
        toolCalls.push({
          id: accum.id,
          type: 'function',
          function: { name: accum.name, arguments: accum.args },
        });
      }

      if (toolCalls.length === 0) break;

      // Add assistant message
      openAIMessages.push({
        role: 'assistant',
        content: assistantText || null,
        tool_calls: toolCalls,
      });

      // Execute tools
      for (const tc of toolCalls) {
        let args: unknown;
        try { args = JSON.parse(tc.function.arguments); } catch { args = {}; }

        const { content, serverId } = await callTool(tc.function.name, args);
        callbacks.onToolCall(tc.function.name, serverId, args);
        callbacks.onToolResult(tc.function.name, content);

        openAIMessages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content,
        });
      }
    }

    return finalText;
  }
}
