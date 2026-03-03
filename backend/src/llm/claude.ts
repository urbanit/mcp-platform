import Anthropic from '@anthropic-ai/sdk';
import type { ILlmAdapter, ChatMessage, McpTool, StreamCallbacks } from './types.js';

type AnthropicMessage = Anthropic.MessageParam;
type AnthropicTool = Anthropic.Tool;

export class ClaudeAdapter implements ILlmAdapter {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;

  constructor(model: string, maxTokens: number) {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.model = model;
    this.maxTokens = maxTokens;
  }

  async chat(
    messages: ChatMessage[],
    tools: McpTool[],
    callbacks: StreamCallbacks,
    callTool: (name: string, args: unknown) => Promise<{ content: string; serverId: string }>,
  ): Promise<string> {
    const anthropicMessages: AnthropicMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const anthropicTools: AnthropicTool[] = tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema as Anthropic.Tool['input_schema'],
    }));

    let finalText = '';

    // Agentic loop
    while (true) {
      const toolUseBlocks: Anthropic.ToolUseBlock[] = [];
      let assistantText = '';

      const stream = await this.client.messages.stream({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: anthropicMessages,
        tools: anthropicTools.length > 0 ? anthropicTools : undefined,
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            callbacks.onToken(event.delta.text);
            assistantText += event.delta.text;
          }
        }
      }

      const response = await stream.finalMessage();

      // Collect tool use blocks
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          toolUseBlocks.push(block);
        } else if (block.type === 'text') {
          // Already streamed above
        }
      }

      finalText += assistantText;

      if (toolUseBlocks.length === 0 || response.stop_reason === 'end_turn') {
        break;
      }

      // Add assistant message with tool use
      anthropicMessages.push({ role: 'assistant', content: response.content });

      // Execute tools and collect results
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUseBlocks) {
        const { content, serverId } = await callTool(toolUse.name, toolUse.input);
        callbacks.onToolCall(toolUse.name, serverId, toolUse.input);
        callbacks.onToolResult(toolUse.name, content);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content,
        });
      }

      anthropicMessages.push({ role: 'user', content: toolResults });
    }

    return finalText;
  }
}
