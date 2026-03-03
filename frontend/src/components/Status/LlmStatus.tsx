const API = import.meta.env.VITE_API_URL ?? `http://${window.location.host}`;

interface LlmProvider { id: string; type: string; model: string; active: boolean }
interface LlmInfo { active: string; providers: LlmProvider[] }

interface Props { llm: LlmInfo | null; error: string }

export function LlmStatus({ llm, error }: Props) {
  if (error) return <p style={{ color: '#f87171', margin: 0 }}>LLM error: {error}</p>;
  if (!llm) return <p style={{ opacity: 0.5, margin: 0 }}>Loading…</p>;

  return (
    <section>
      <h2 style={{ margin: '0 0 12px', fontSize: 16, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>
        LLM Providers
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {llm.providers.map((p) => (
          <div
            key={p.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              borderRadius: 8,
              background: '#1e293b',
              border: p.active ? '1px solid #2563eb' : '1px solid #334155',
            }}
          >
            <span
              style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: p.active ? '#60a5fa' : '#475569',
              }}
            />
            <span style={{ fontWeight: 600, minWidth: 80 }}>{p.id}</span>
            <span style={{ opacity: 0.5, fontSize: 13 }}>{p.model}</span>
            {p.active && (
              <span style={{ marginLeft: 'auto', color: '#60a5fa', fontSize: 12, fontWeight: 600 }}>
                ACTIVE
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export { API };
