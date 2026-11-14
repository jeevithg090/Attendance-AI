// Server-Sent Events hook with automatic reconnection.
import { useEffect, useRef, useState } from 'react';

export interface SSEEvent {
  type: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

interface SSEOptions {
  url: string;
  onMessage?: (event: SSEEvent) => void;
  enabled?: boolean;
  reconnectDelayMs?: number;
}

export function useSSE({ url, onMessage, enabled = true, reconnectDelayMs = 5000 }: SSEOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!enabled || !url) return;

    let source: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;

    const connect = () => {
      // EventSource cannot send an Authorization header, so the JWT goes in the query string.
      const token = localStorage.getItem('attendai_token') ?? '';
      const fullUrl = `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
      source = new EventSource(fullUrl);

      source.onopen = () => setIsConnected(true);
      source.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as SSEEvent;
          setLastEvent(data);
          onMessageRef.current?.(data);
        } catch {
          console.error('SSE parse error');
        }
      };
      source.onerror = () => {
        setIsConnected(false);
        source?.close();
        if (!disposed) reconnectTimer = setTimeout(connect, reconnectDelayMs);
      };
    };

    connect();

    return () => {
      disposed = true;
      clearTimeout(reconnectTimer);
      source?.close();
      setIsConnected(false);
    };
  }, [url, enabled, reconnectDelayMs]);

  return { isConnected, lastEvent };
}
