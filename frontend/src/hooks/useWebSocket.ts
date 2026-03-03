import { useEffect, useRef } from 'react';
import type { WsMessage } from '../types.js';

type Subscriber = (msg: WsMessage) => void;

// Keyed by URL so multiple widget instances with different backends can coexist
const wsInstances = new Map<string, WebSocket>();
const subscriberMaps = new Map<string, Map<string, Subscriber>>();

function defaultWsUrl(): string {
  return import.meta.env.VITE_WS_URL ?? `ws://${window.location.host}/ws`;
}

function getWs(url: string): WebSocket {
  const existing = wsInstances.get(url);
  if (existing && existing.readyState < 2) return existing;

  const ws = new WebSocket(url);
  wsInstances.set(url, ws);
  if (!subscriberMaps.has(url)) subscriberMaps.set(url, new Map());

  ws.onmessage = (event) => {
    let msg: WsMessage;
    try { msg = JSON.parse(event.data as string) as WsMessage; } catch { return; }
    const sub = subscriberMaps.get(url)?.get(msg.id);
    if (sub) sub(msg);
  };

  ws.onclose = () => {
    setTimeout(() => { wsInstances.delete(url); }, 2000);
  };

  return ws;
}

export function useWebSocket(wsUrl?: string) {
  const url = wsUrl ?? defaultWsUrl();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    wsRef.current = getWs(url);
  }, [url]);

  function send(payload: unknown): void {
    const ws = getWs(url);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    } else {
      ws.addEventListener('open', () => ws.send(JSON.stringify(payload)), { once: true });
    }
  }

  function subscribe(id: string, cb: Subscriber): () => void {
    if (!subscriberMaps.has(url)) subscriberMaps.set(url, new Map());
    subscriberMaps.get(url)!.set(id, cb);
    return () => subscriberMaps.get(url)?.delete(id);
  }

  return { send, subscribe };
}
