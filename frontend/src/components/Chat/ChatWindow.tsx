import { useState, useCallback, useEffect } from 'react';
import { MessageList } from './MessageList.js';
import { InputBar } from './InputBar.js';
import { useWebSocket } from '../../hooks/useWebSocket.js';
import type { ChatMessage, WsMessage } from '../../types.js';

const API = import.meta.env.VITE_API_URL ?? `http://${window.location.host}`;

let msgIdCounter = 0;
function nextId() { return `msg-${++msgIdCounter}-${Date.now()}`; }

interface LlmProvider { id: string; type: string; model: string }

export function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const { send, subscribe } = useWebSocket();

  // LLM switcher state
  const [providers, setProviders] = useState<LlmProvider[]>([]);
  const [activeLlm, setActiveLlm] = useState('');

  useEffect(() => {
    fetch(`${API}/api/config`)
      .then((r) => r.json())
      .then((cfg) => {
        setProviders(
          Object.entries(cfg.llm.providers as Record<string, { type: string; model: string }>).map(
            ([id, p]) => ({ id, type: p.type, model: p.model }),
          ),
        );
        setActiveLlm(cfg.llm.active as string);
      })
      .catch(() => {});
  }, []);

  async function handleLlmChange(newActive: string) {
    setActiveLlm(newActive);
    try {
      const r = await fetch(`${API}/api/config`);
      const cfg = await r.json();
      cfg.llm.active = newActive;
      await fetch(`${API}/api/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      });
    } catch {
      // Non-fatal — backend will use the old value until next restart
    }
  }

  const handleSend = useCallback(
    (text: string) => {
      const id = nextId();
      const userMsg: ChatMessage = { role: 'user', content: text };

      setMessages((prev) => [...prev, userMsg]);
      setStreamingContent('');
      setBusy(true);

      const unsub = subscribe(id, (msg: WsMessage) => {
        if (msg.type === 'token') {
          setStreamingContent((prev) => (prev ?? '') + msg.delta);
        } else if (msg.type === 'tool_result') {
          // If the result is a rich payload, inject it as an assistant message immediately
          try {
            const parsed = JSON.parse(msg.result) as Record<string, unknown>;
            if (parsed.__rich__) {
              setMessages((prev) => [...prev, { role: 'assistant', content: msg.result }]);
            }
          } catch { /* plain text result — skip */ }
        } else if (msg.type === 'done') {
          if (msg.finalText.trim()) {
            setMessages((prev) => [...prev, { role: 'assistant', content: msg.finalText }]);
          }
          setStreamingContent(undefined);
          setBusy(false);
          unsub();
        } else if (msg.type === 'error') {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: `⚠️ Error: ${msg.message}` },
          ]);
          setStreamingContent(undefined);
          setBusy(false);
          unsub();
        }
      });

      send({ type: 'chat', id, message: text, history: messages });
    },
    [messages, send, subscribe],
  );

  const activeProvider = providers.find((p) => p.id === activeLlm);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#0f172a',
        color: '#f1f5f9',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          borderBottom: '1px solid #334155',
          background: '#1e293b',
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 16 }}>MCP Chat</span>

        {/* LLM switcher */}
        {providers.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, opacity: 0.5 }}>LLM</span>
            <select
              value={activeLlm}
              onChange={(e) => handleLlmChange(e.target.value)}
              disabled={busy}
              style={{
                background: '#0f172a',
                color: '#f1f5f9',
                border: '1px solid #475569',
                borderRadius: 6,
                padding: '4px 8px',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id} ({p.model})
                </option>
              ))}
            </select>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: activeProvider?.type === 'claude' ? '#60a5fa' : '#34d399',
                display: 'inline-block',
              }}
            />
          </div>
        )}
      </div>

      <MessageList messages={messages} streamingContent={streamingContent} />
      <InputBar onSend={handleSend} disabled={busy} />
    </div>
  );
}
