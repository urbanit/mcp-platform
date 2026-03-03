# CLAUDE.md

## Project: MCP Client Platform

A full MCP (Model Context Protocol) client platform connecting LLMs (Claude, GitHub Copilot) to MCP servers, with a streaming React chat UI and status page — all running in Docker Compose.

## Architecture

```
Browser
  ├── localhost:8080  →  frontend (nginx + React Vite build)
  │     ├── /              Chat page
  │     └── /status.html   Status/verification page
  └── localhost:4000  →  backend (Express + WebSocket)
        ├── WS /ws          streaming chat
        ├── GET /api/status LLM + MCP health
        └── GET|PUT /api/config  read/write config
```

Docker network `mcp-net` — backend connects to MCP servers by container name.

## Services

| Service        | Port | Description                     |
|----------------|------|---------------------------------|
| mcp-calculator | 3001 | Calculator MCP server           |
| mcp-map        | 3002 | Map/geocoding MCP server        |
| backend        | 4000 | Express + WS, LLM adapters      |
| frontend       | 8080 | nginx serving Vite React build  |

## Build & Run

```bash
cp .env.example .env
# Fill in ANTHROPIC_API_KEY and/or GITHUB_TOKEN

docker compose up --build
```

## Development (without Docker)

```bash
# Each service — run in separate terminals
cd mcp-servers/calculator && npm install && npm run dev
cd mcp-servers/map        && npm install && npm run dev
cd backend                && npm install && npm run dev
cd frontend               && npm install && npm run dev
```

## Config

Edit `config/mcp-servers.json` to:
- Switch active LLM (`llm.active`: `"claude"` | `"copilot"`)
- Add/remove MCP servers
- Use `PUT /api/config` to update at runtime without restarting

## Directory Structure

```
mcp-servers/calculator/   Calculator MCP (add, subtract, multiply, divide, power)
mcp-servers/map/          Map MCP (search_location → Nominatim + Leaflet rich payload)
backend/src/
  config/loader.ts        Read/write mcp-servers.json
  llm/types.ts            ILlmAdapter interface
  llm/claude.ts           Anthropic SDK streaming adapter
  llm/copilot.ts          OpenAI SDK (GitHub Copilot) adapter
  mcp/client.ts           MCP SDK client wrapper
  mcp/manager.ts          Multi-server aggregator
  api/routes.ts           REST endpoints
  api/websocket.ts        WS chat handler
  index.ts                Entry point
frontend/src/
  hooks/useWebSocket.ts   Singleton WS with subscriber map
  components/Chat/        ChatWindow, MessageList, MessageBubble, InputBar
  components/RichContent/ RichRenderer, MapWidget (Leaflet), CodeBlock (highlight.js)
  components/Status/      LlmStatus, McpServerStatus
  chat-main.tsx           Chat page entry
  status-main.tsx         Status page entry
```

## Key Notes

- All Node services use `"type": "module"` + TypeScript + Node 22 Alpine
- MCP SDK imports require `.js` extension in TS source
- `VITE_WS_URL` and `VITE_API_URL` are baked in at build time via Docker build args
- Leaflet icons fixed with `Icon.Default.mergeOptions()` pointing to unpkg CDN
- Nominatim (free geocoding) requires `User-Agent` header; rate limit 1 req/sec
- Tool names are prefixed `{serverId}__{toolName}` to avoid collisions across servers
