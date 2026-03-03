import { Router } from 'express';
import type { McpManager } from '../mcp/manager.js';
import { loadConfig, saveConfig } from '../config/loader.js';
import type { AppConfig } from '../config/loader.js';

export function createRouter(mcpManager: McpManager): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  router.get('/api/status', async (_req, res) => {
    try {
      const config = await loadConfig();
      const mcpStatuses = await mcpManager.getStatus();

      res.json({
        llm: {
          active: config.llm.active,
          providers: Object.entries(config.llm.providers).map(([id, p]) => ({
            id,
            type: p.type,
            model: p.model,
            active: id === config.llm.active,
          })),
        },
        mcpServers: mcpStatuses,
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  router.get('/api/config', async (_req, res) => {
    try {
      const config = await loadConfig();
      res.json(config);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  router.put('/api/config', async (req, res) => {
    try {
      const config = req.body as AppConfig;
      await saveConfig(config);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  return router;
}
