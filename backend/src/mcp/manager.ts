import { McpClient } from './client.js';
import type { McpTool } from '../llm/types.js';

interface ServerConfig {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
}

export interface ServerStatus {
  id: string;
  name: string;
  url: string;
  connected: boolean;
  toolCount: number;
}

export class McpManager {
  private clients: Map<string, McpClient> = new Map();
  private serverConfigs: Map<string, ServerConfig> = new Map();
  // Map from prefixed tool name → serverId
  private toolIndex: Map<string, string> = new Map();
  private allTools: McpTool[] = [];

  async init(servers: ServerConfig[]): Promise<void> {
    for (const srv of servers) {
      if (!srv.enabled) continue;
      this.serverConfigs.set(srv.id, srv);
      const client = new McpClient(srv.id, srv.name, srv.url);
      try {
        await client.connect();
        this.clients.set(srv.id, client);
      } catch (err) {
        console.error(`[McpManager] Failed to connect to ${srv.id}:`, err);
      }
    }
    await this.refreshTools();
  }

  async addServer(config: ServerConfig): Promise<void> {
    this.serverConfigs.set(config.id, config);
    const client = new McpClient(config.id, config.name, config.url);
    try {
      await client.connect();
      this.clients.set(config.id, client);
    } catch (err) {
      console.error(`[McpManager] Failed to connect to ${config.id}:`, err);
    }
    await this.refreshTools();
  }

  async removeServer(id: string): Promise<void> {
    this.clients.delete(id);
    this.serverConfigs.delete(id);
    await this.refreshTools();
  }

  private async refreshTools(): Promise<void> {
    this.allTools = [];
    this.toolIndex.clear();

    for (const [id, client] of this.clients) {
      try {
        const tools = await client.listTools();
        for (const tool of tools) {
          const prefixedName = `${id}__${tool.name}`;
          this.allTools.push({ ...tool, name: prefixedName });
          this.toolIndex.set(prefixedName, id);
        }
      } catch (err) {
        console.error(`[McpManager] Failed to list tools from ${id}:`, err);
      }
    }
  }

  getTools(): McpTool[] {
    return this.allTools;
  }

  async callTool(prefixedName: string, args: unknown): Promise<{ content: string; serverId: string }> {
    const serverId = this.toolIndex.get(prefixedName);
    if (!serverId) throw new Error(`Unknown tool: ${prefixedName}`);

    const client = this.clients.get(serverId);
    if (!client) throw new Error(`No client for server: ${serverId}`);

    const actualName = prefixedName.replace(`${serverId}__`, '');
    const content = await client.callTool(actualName, args);
    return { content, serverId };
  }

  async getStatus(): Promise<ServerStatus[]> {
    const statuses: ServerStatus[] = [];
    for (const [id, config] of this.serverConfigs) {
      const client = this.clients.get(id);
      const connected = client ? await client.ping() : false;
      const tools = this.allTools.filter((t) => this.toolIndex.get(t.name) === id);
      statuses.push({ id, name: config.name, url: config.url, connected, toolCount: tools.length });
    }
    return statuses;
  }
}
