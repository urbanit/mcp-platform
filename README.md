# MCP Platform

A full-stack [Model Context Protocol](https://modelcontextprotocol.io) client platform that connects LLMs to MCP servers with a streaming React chat UI.

![Chat UI with Leaflet map rendered from a tool result](https://placehold.co/800x400?text=MCP+Platform)

## Features

- **Streaming chat** via WebSocket — tokens appear in real time
- **Agentic tool use** — LLM autonomously calls MCP tools and streams results back
- **Rich content rendering** — map tool results render as interactive Leaflet maps; code blocks use syntax highlighting
- **LLM switcher** — toggle between Claude and GitHub Models (GPT-4o) from the chat UI without restarting
- **Status page** — live view of LLM config and MCP server health
- **Fully Dockerized** — single `docker compose up --build`

## Architecture

```
Browser (localhost:8080)
  ├── /              Chat page
  └── /status.html   Status page

nginx
  ├── /ws    → backend:4000  (WebSocket)
  └── /api/  → backend:4000  (REST)

backend (Express + WebSocket)
  ├── Claude adapter   (@anthropic-ai/sdk)
  └── Copilot adapter  (openai → models.inference.ai.azure.com)

MCP Servers
  ├── mcp-calculator:3001  (add, subtract, multiply, divide, power)
  └── mcp-map:3002         (search_location → Nominatim geocoding)
```

## Quick Start

**Prerequisites:** Docker Desktop, an Anthropic API key and/or GitHub PAT

```bash
git clone https://github.com/urbanit/mcp-platform
cd mcp-platform

cp .env.example .env
# Edit .env and add your keys

docker compose up --build
```

Then open:
- **http://localhost:8080** — chat
- **http://localhost:8080/status.html** — status

## Environment Variables

| Variable | Required for |
|---|---|
| `ANTHROPIC_API_KEY` | Claude (claude-sonnet-4-6) |
| `GITHUB_TOKEN` | GitHub Models (gpt-4o) — needs `models:read` scope |

## Configuration

Edit `config/mcp-servers.json` to switch LLMs or add MCP servers. Changes are live-reloaded — no restart needed.

```json
{
  "llm": {
    "active": "claude",
    "providers": {
      "claude":  { "type": "claude",  "model": "claude-sonnet-4-6", "maxTokens": 4096 },
      "copilot": { "type": "copilot", "model": "gpt-4o", "baseUrl": "https://models.inference.ai.azure.com" }
    }
  },
  "mcpServers": [
    { "id": "calculator", "name": "Calculator", "url": "http://mcp-calculator:3001/mcp", "enabled": true },
    { "id": "map",        "name": "Map & Geocoding", "url": "http://mcp-map:3002/mcp",  "enabled": true }
  ]
}
```

## Example Prompts

- `What is 17 * 23?` — uses the calculator tool
- `Show me Paris on a map` — geocodes via Nominatim and renders a Leaflet map
- `What is the square root of 2 to 10 decimal places?` — chained calculator calls

## Adding an MCP Server

**Via the status page UI** (recommended):
1. Open **http://localhost:8080/status.html**
2. Fill in the Name and URL fields at the bottom of the MCP Servers section and click **Add**
3. The server is connected immediately and persisted to `config/mcp-servers.json`
4. Click **×** next to any server to remove it

**Via config file directly:**
1. Add an entry to `config/mcp-servers.json` under `mcpServers`
2. Restart the backend: `docker compose up -d --no-build --force-recreate backend`

The server ID is auto-derived from the name (lowercased, spaces → hyphens). External servers (outside Docker) should use a URL reachable from the backend container — use `host.docker.internal` instead of `localhost` when running the MCP server on your machine.

## Tech Stack

| Layer | Stack |
|---|---|
| Frontend | React 19, Vite 7, Leaflet, highlight.js |
| Backend | Node 22, Express 5, ws, TypeScript |
| LLMs | Anthropic SDK, OpenAI SDK |
| MCP | `@modelcontextprotocol/sdk` |
| Infra | Docker Compose, nginx |
