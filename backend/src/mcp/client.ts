import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { McpTool } from '../llm/types.js';

export class McpClient {
  private client: Client;
  private url: string;
  public id: string;
  public name: string;

  constructor(id: string, name: string, url: string) {
    this.id = id;
    this.name = name;
    this.url = url;
    this.client = new Client({ name: 'mcp-backend', version: '1.0.0' });
  }

  async connect(): Promise<void> {
    const transport = new StreamableHTTPClientTransport(new URL(this.url));
    await this.client.connect(transport);
  }

  async listTools(): Promise<McpTool[]> {
    const result = await this.client.listTools();
    return result.tools.map((t) => ({
      name: t.name,
      description: t.description ?? '',
      inputSchema: t.inputSchema as Record<string, unknown>,
    }));
  }

  async callTool(name: string, args: unknown): Promise<string> {
    const result = await this.client.callTool({ name, arguments: args as Record<string, unknown> });
    const content = result.content as Array<{ type: string; text?: string }>;
    const parts: string[] = [];
    for (const c of content) {
      if (c.type === 'text' && c.text) parts.push(c.text);
    }
    return parts.join('\n');
  }

  async ping(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }
}
