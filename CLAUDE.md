# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: MCP Client Platform

A full MCP (Model Context Protocol) client platform connecting LLMs (Claude, GitHub Models/gpt-4o) to MCP servers, with a streaming React chat UI and status page — all running in Docker Compose.

## Architecture

```
Browser
  ├── localhost:8080  →  frontend (nginx + React Vite build)
  │     ├── /              Chat page
  │     └── /status.html   Status/verification page
  └── localhost:8080  →  nginx proxies:
        ├── /ws       →  backend:4000  (WebSocket upgrade)
        └── /api/     →  backend:4000  (REST)
```

Docker network `mcp-net` — backend connects to MCP servers by container name.

## Services

| Service        | Port | Description                    |
|----------------|------|--------------------------------|
| mcp-calculator | 3001 | Calculator MCP server          |
| mcp-map        | 3002 | Map/geocoding MCP server       |
| backend        | 4000 | Express + WS, LLM adapters     |
| frontend       | 8080 | nginx serving Vite React build |

## Build & Run

```bash
cp .env.example .env
# Fill in ANTHROPIC_API_KEY and/or GITHUB_TOKEN

docker compose up --build
```

To rebuild a single service after code changes:
```bash
docker compose build backend && docker compose up -d --no-build --force-recreate backend
```

Use `--force-recreate` (not `restart`) to ensure env vars are reloaded.

## Config

`config/mcp-servers.json` controls the active LLM and MCP servers. The backend volume-mounts this file so changes take effect immediately via `PUT /api/config` — no restart needed.

- Switch active LLM: set `llm.active` to `"claude"` or `"copilot"`
- The `copilot` provider uses **GitHub Models** (`models.inference.ai.azure.com`) with a PAT — not `api.githubcopilot.com` (which requires an OAuth app token, not a PAT)

## Directory Structure

```
config/mcp-servers.json     LLM + MCP server config (live-reloaded)
mcp-servers/calculator/     Calculator MCP (add, subtract, multiply, divide, power)
mcp-servers/map/            Map MCP (search_location → Nominatim → rich Leaflet payload)
backend/src/
  config/loader.ts          Read/write mcp-servers.json via CONFIG_PATH env var
  llm/types.ts              ILlmAdapter interface, shared types
  llm/claude.ts             Anthropic SDK streaming adapter
  llm/copilot.ts            OpenAI SDK adapter (GitHub Models baseURL)
  mcp/client.ts             MCP SDK client wrapper
  mcp/manager.ts            Multi-server aggregator; addServer()/removeServer() for live management; prefixes tool names {serverId}__{tool}
  api/routes.ts             GET /health, GET|PUT /api/config, GET /api/status, POST|DELETE /api/mcp-servers
  api/websocket.ts          WS chat handler — streams tokens/tool events to browser
  index.ts                  Entry point (top-level await, re-reads config per request)
frontend/src/
  hooks/useWebSocket.ts     URL-keyed singleton WS; accepts optional wsUrl param
  components/Chat/          ChatWindow (accepts apiUrl/wsUrl props), MessageList, MessageBubble, InputBar
  components/RichContent/   RichRenderer, MapWidget (Leaflet), CodeBlock (highlight.js)
  components/Status/        LlmStatus, McpServerStatus (add/remove form)
  chat-main.tsx             Chat page entry (plain React mount)
  status-main.tsx           Status page entry
  widget.tsx                Web component entry — registers <mcp-chat> as plain HTMLElement subclass
frontend/vite.config.ts         App build (two HTML entry points)
frontend/vite.widget.config.ts  Widget build — IIFE lib with CSS inlined, outputs dist/widget/mcp-chat.js
nginx/nginx.conf            Proxies /ws and /api/ to backend; CORS on /widget/; serves static files
```

## WebSocket Protocol

**Client → Server:** `{ type: 'chat', id, message, history }`

**Server → Client:**
- `{ type: 'token', id, delta }` — streamed text chunk
- `{ type: 'tool_call', id, toolName, serverId, args }`
- `{ type: 'tool_result', id, toolName, result }`
- `{ type: 'done', id, finalText }`
- `{ type: 'error', id, message }`

## Rich Content Protocol

Tool results with `{"__rich__": true, "type": "map", "lat", "lng", "zoom", "name"}` are detected in the WS handler and forwarded as `tool_result` messages. `RichRenderer` parses them and renders the appropriate widget. `MessageBubble` detects rich content (JSON starting with `{"__rich__"`) and renders it full-width, bypassing the 80% bubble width constraint.

## MCP Server Management

Servers can be added/removed at runtime without restarting:

- **UI**: status page (`/status.html`) — Name + URL form at the bottom; **×** to remove
- **API**: `POST /api/mcp-servers` `{ id, name, url }` / `DELETE /api/mcp-servers/:id`
- Both immediately update the running `McpManager` and persist to `config/mcp-servers.json`
- `McpManager` tracks all configured servers (including disconnected ones); only connected servers contribute tools
- For external servers running on the host: use `http://host.docker.internal:<port>/mcp` (not `localhost`)

## Web Component / Widget

The chat UI is published as a native custom element `<mcp-chat>` at `/widget/mcp-chat.js`.

```html
<script src="http://your-server:8080/widget/mcp-chat.js"></script>
<mcp-chat api-url="http://your-server:8080" ws-url="ws://your-server:8080/ws"></mcp-chat>
```

- Built by `vite.widget.config.ts` as an IIFE with all CSS inlined (`vite-plugin-css-injected-by-js`)
- Implemented as a plain `HTMLElement` subclass (NOT r2wc/shadow DOM) — renders React via `createRoot` into a flex container that fills the host element
- `api-url` / `ws-url` HTML attributes read via `getAttribute` and passed as `apiUrl` / `wsUrl` props
- When attributes are omitted, falls back to same-origin (env vars → `window.location.host`)
- `useWebSocket` is URL-keyed so multiple instances on the same page with different backends work
- `ChatWindow` uses `height: 100%` — size the element with CSS (e.g. `mcp-chat { display: block; height: 600px }`)
- Widget Vite config defines `process.env.NODE_ENV = "production"` — required to avoid "process is not defined" runtime error in IIFE bundles
- Dockerfile runs `npm run build && npm run build:widget`; widget lands in `dist/widget/` alongside the app
- **Do not use r2wc or shadow DOM** for this widget — shadow DOM isolates CSS injection and breaks height inheritance

## Key Implementation Notes

- All Node services: `"type": "module"` + TypeScript + Node 22 Alpine
- MCP SDK imports require `.js` extension in TS source (ESM)
- MCP servers are **stateless**: create a new `McpServer` + `StreamableHTTPServerTransport` per request
- `VITE_WS_URL` and `VITE_API_URL` are baked in at Vite build time via Docker build args (point to port 8080)
- Leaflet icons patched at module level: `delete (L.Icon.Default.prototype as any)._getIconUrl` + `mergeOptions()` with unpkg CDN URLs
- Nominatim (free geocoding) requires `User-Agent` header; rate limit 1 req/sec
- Express 5 wildcard route syntax: `/{*path}` (not `*`)
- `import.meta.env` requires `/// <reference types="vite/client" />` in `vite-env.d.ts`
