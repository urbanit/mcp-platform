import { useState } from 'react';
import { API } from './LlmStatus.js';

interface ServerStatus { id: string; name: string; url: string; connected: boolean; toolCount: number }
interface Props { servers: ServerStatus[]; error: string; onRefresh: () => void }

export function McpServerStatus({ servers, error, onRefresh }: Props) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);

  function deriveId(n: string): string {
    return n.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setAddError('');
    try {
      const res = await fetch(`${API}/api/mcp-servers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deriveId(name), name, url }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setName('');
      setUrl('');
      onRefresh();
    } catch (err) {
      setAddError(String(err));
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(id: string) {
    setRemovingId(id);
    try {
      await fetch(`${API}/api/mcp-servers/${id}`, { method: 'DELETE' });
      onRefresh();
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <section>
      <h2 style={{ margin: '0 0 12px', fontSize: 16, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>
        MCP Servers
      </h2>

      {error && <p style={{ color: '#f87171', margin: '0 0 12px' }}>MCP error: {error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {servers.map((srv) => (
          <div
            key={srv.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              borderRadius: 8,
              background: '#1e293b',
              border: `1px solid ${srv.connected ? '#16a34a' : '#dc2626'}`,
            }}
          >
            <span
              style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: srv.connected ? '#4ade80' : '#f87171',
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>{srv.name}</div>
              <div style={{ fontSize: 11, opacity: 0.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {srv.url}
              </div>
            </div>
            <span style={{ opacity: 0.5, fontSize: 13, flexShrink: 0 }}>
              {srv.connected ? `${srv.toolCount} tool${srv.toolCount !== 1 ? 's' : ''}` : 'disconnected'}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: srv.connected ? '#4ade80' : '#f87171', flexShrink: 0 }}>
              {srv.connected ? 'ONLINE' : 'OFFLINE'}
            </span>
            <button
              onClick={() => handleRemove(srv.id)}
              disabled={removingId === srv.id}
              title="Remove server"
              style={{
                background: 'none',
                border: '1px solid #475569',
                borderRadius: 4,
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: 14,
                lineHeight: 1,
                padding: '2px 6px',
                flexShrink: 0,
              }}
            >
              {removingId === srv.id ? '…' : '×'}
            </button>
          </div>
        ))}

        {servers.length === 0 && !error && (
          <p style={{ opacity: 0.5, margin: 0 }}>No MCP servers configured.</p>
        )}
      </div>

      {/* Add server form */}
      <form onSubmit={handleAdd} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="url"
            placeholder="URL  (e.g. http://host:3000/mcp)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            style={{ ...inputStyle, flex: 2 }}
          />
          <button
            type="submit"
            disabled={adding}
            style={{
              background: '#2563eb',
              border: 'none',
              borderRadius: 6,
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
              padding: '0 16px',
              flexShrink: 0,
            }}
          >
            {adding ? '…' : 'Add'}
          </button>
        </div>
        {addError && <p style={{ color: '#f87171', margin: 0, fontSize: 13 }}>{addError}</p>}
      </form>
    </section>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 6,
  color: '#f1f5f9',
  fontSize: 13,
  padding: '8px 10px',
  outline: 'none',
};
