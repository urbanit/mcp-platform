interface ServerStatus { id: string; name: string; connected: boolean; toolCount: number }
interface Props { servers: ServerStatus[]; error: string }

export function McpServerStatus({ servers, error }: Props) {
  if (error) return <p style={{ color: '#f87171', margin: 0 }}>MCP error: {error}</p>;

  return (
    <section>
      <h2 style={{ margin: '0 0 12px', fontSize: 16, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>
        MCP Servers
      </h2>
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
            <span style={{ fontWeight: 600, minWidth: 120 }}>{srv.name}</span>
            <span style={{ opacity: 0.5, fontSize: 13 }}>
              {srv.connected ? `${srv.toolCount} tool${srv.toolCount !== 1 ? 's' : ''}` : 'disconnected'}
            </span>
            <span
              style={{
                marginLeft: 'auto', fontSize: 12, fontWeight: 600,
                color: srv.connected ? '#4ade80' : '#f87171',
              }}
            >
              {srv.connected ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        ))}
        {servers.length === 0 && !error && (
          <p style={{ opacity: 0.5, margin: 0 }}>No MCP servers configured.</p>
        )}
      </div>
    </section>
  );
}
