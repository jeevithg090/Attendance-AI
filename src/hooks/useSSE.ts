// ═══════════════════════════════════════════════════════════
// AttendAI — SSE Hook (Server-Sent Events)
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';

interface SSEOptions {
  url: string;
  onMessage?: (data: any) => void;
  enabled?: boolean;
}

export function useSSE({ url, onMessage, enabled = true }: SSEOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<any>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (!enabled) return;

    const token = localStorage.getItem('attendai_token');
    const fullUrl = `${url}${url.includes('?') ? '&' : '?'}token=${token}`;

    const eventSource = new EventSource(fullUrl);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastEvent(data);
        onMessage?.(data);
      } catch {
        console.error('SSE parse error');
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();
      // Reconnect after 5 seconds
      setTimeout(connect, 5000);
    };
  }, [url, onMessage, enabled]);

  const disconnect = useCallback(() => {
    eventSourceRef.current?.close();
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (enabled) connect();
    return () => disconnect();
  }, [enabled, connect, disconnect]);

  return { isConnected, lastEvent, disconnect };
}
