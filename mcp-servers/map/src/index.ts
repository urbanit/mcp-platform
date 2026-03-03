import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

const app = express();
app.use(express.json());

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

async function geocode(query: string): Promise<NominatimResult | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'mcp-map/1.0 (mcp-client-platform)' },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as NominatimResult[];
  return data[0] ?? null;
}

function createServer() {
  const mcpServer = new McpServer({ name: 'map', version: '1.0.0' });

  mcpServer.tool(
    'search_location',
    'Search for a location and return a rich map payload for rendering in the UI',
    { query: z.string().describe('Location name or address to search for') },
    async ({ query }) => {
      const result = await geocode(query);
      if (!result) {
        return {
          content: [{ type: 'text', text: `Location not found: ${query}` }],
          isError: true,
        };
      }

      const richPayload = JSON.stringify({
        __rich__: true,
        type: 'map',
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        zoom: 13,
        name: result.display_name,
      });

      return { content: [{ type: 'text', text: richPayload }] };
    },
  );

  return mcpServer;
}

// Stateless: new transport + server instance per request
app.post('/mcp', async (req, res) => {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on('close', () => transport.close());
  const server = createServer();
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.get('/mcp', async (req, res) => {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on('close', () => transport.close());
  const server = createServer();
  await server.connect(transport);
  await transport.handleRequest(req, res);
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(3002, () => console.log('Map MCP server listening on :3002'));
