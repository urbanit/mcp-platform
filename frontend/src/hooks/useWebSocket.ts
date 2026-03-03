import { useEffect, useRef } from 'react';
import type { WsMessage } from '../types.js';

type Subscriber = (msg: WsMessage) => void;

const WS_URL = import.meta.env.VITE_WS_URL ?? `ws://${window.location.host}/ws`;

// Singleton WebSocket shared across all component instances
let globalWs: WebSocket | null = null;
const subscribers = new Map<string, Subscriber>();

function getWs(): WebSocket {
  if (globalWs && globalWs.readyState < 2) return globalWs;

  globalWs = new WebSocket(WS_URL);

  globalWs.onmessage = (event) => {
    let msg: WsMessage;
    try { msg = JSON.parse(event.data as string) as WsMessage; } catch { return; }
    const sub = subscribers.get(msg.id);
    if (sub) sub(msg);
  };

  globalWs.onclose = () => {
    // Reconnect after short delay
    setTimeout(() => { globalWs = null; }, 2000);
  };

  return globalWs;
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    wsRef.current = getWs();
  }, []);

  function send(payload: unknown): void {
    const ws = getWs();
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    } else {
      ws.addEventListener('open', () => ws.send(JSON.stringify(payload)), { once: true });
    }
  }

  function subscribe(id: string, cb: Subscriber): () => void {
    subscribers.set(id, cb);
    return () => subscribers.delete(id);
  }

  return { send, subscribe };
}
