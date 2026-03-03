import { readFile, writeFile } from 'fs/promises';

export interface LlmProviderConfig {
  type: string;
  model: string;
  maxTokens?: number;
  baseUrl?: string;
}

export interface McpServerConfig {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
}

export interface AppConfig {
  llm: {
    active: string;
    providers: Record<string, LlmProviderConfig>;
  };
  mcpServers: McpServerConfig[];
}

function configPath(): string {
  return process.env.CONFIG_PATH ?? './config/mcp-servers.json';
}

export async function loadConfig(): Promise<AppConfig> {
  const raw = await readFile(configPath(), 'utf-8');
  return JSON.parse(raw) as AppConfig;
}

export async function saveConfig(config: AppConfig): Promise<void> {
  await writeFile(configPath(), JSON.stringify(config, null, 2), 'utf-8');
}
