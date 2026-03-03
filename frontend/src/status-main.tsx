import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { LlmStatus, API } from './components/Status/LlmStatus.js';
import { McpServerStatus } from './components/Status/McpServerStatus.js';

interface StatusData {
  llm: {
    active: string;
    providers: Array<{ id: string; type: string; model: string; active: boolean }>;
  };
  mcpServers: Array<{ id: string; name: string; connected: boolean; toolCount: number }>;
}

function StatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${API}/api/status`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setData(await res.json() as StatusData);
        setError('');
        setLastUpdated(new Date().toLocaleTimeString());
      } catch (e) {
        setError(String(e));
      }
    };
    poll();
    const t = setInterval(poll, 10_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      style={{
        maxWidth: 640,
        margin: '0 auto',
        padding: '40px 20px',
        fontFamily: 'system-ui, sans-serif',
        color: '#f1f5f9',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>MCP Platform Status</h1>
        {lastUpdated && (
          <span style={{ fontSize: 12, opacity: 0.4 }}>updated {lastUpdated}</span>
        )}
        <a
          href="/"
          style={{ marginLeft: 'auto', color: '#60a5fa', fontSize: 13, textDecoration: 'none' }}
        >
          ← Chat
        </a>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <LlmStatus llm={data?.llm ?? null} error={error} />
        <McpServerStatus servers={data?.mcpServers ?? []} error={error} />
      </div>
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <StatusPage />
    </StrictMode>,
  );
}
