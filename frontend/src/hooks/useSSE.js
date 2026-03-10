import { useEffect, useRef, useState, useCallback } from 'react';
import { getAccessToken } from '../store/auth';

export default function useSSE() {
  const [stats, setStats] = useState(null);
  const abortRef = useRef(null);
  const reconnectTimer = useRef(null);
  const lastJsonRef = useRef('');

  useEffect(() => {
    let closed = false;

    async function connect() {
      if (closed) return;

      const token = getAccessToken();
      if (!token) {
        // Not logged in — retry after delay
        if (!closed) reconnectTimer.current = setTimeout(connect, 3000);
        return;
      }

      try {
        const controller = new AbortController();
        abortRef.current = controller;

        // Connect via fetch SSE
        const res = await fetch(`/api/stream?token=${encodeURIComponent(token)}`, {
          signal: controller.signal,
        });

        if (res.status === 401) {
          console.warn('[SSE] Auth failed, retrying after token refresh...');
          if (!closed) reconnectTimer.current = setTimeout(connect, 3000);
          return;
        }

        if (!res.ok) {
          console.error('[SSE] HTTP error:', res.status);
          if (!closed) reconnectTimer.current = setTimeout(connect, 3000);
          return;
        }

        // Stream connected
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done || closed) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE messages (separated by double newline)
          const parts = buffer.split('\n\n');
          buffer = parts.pop(); // keep incomplete part

          for (const part of parts) {
            const line = part.trim();
            if (!line || line.startsWith(':')) continue; // skip heartbeats/comments

            if (line.startsWith('data: ')) {
              try {
                const { type, payload } = JSON.parse(line.slice(6));
                if (type === 'stats' && payload) {
                  const json = line.slice(6);
                  if (json !== lastJsonRef.current) {
                    lastJsonRef.current = json;
                    setStats(payload);
                  }
                }
              } catch (err) {
                console.error('[SSE] Parse error:', err);
              }
            }
          }
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.warn('[SSE] Connection error:', err.message);
      }

      if (!closed) {
        console.log('[SSE] Reconnecting in 3s...');
        reconnectTimer.current = setTimeout(connect, 3000);
      }
    }

    connect();

    return () => {
      closed = true;
      clearTimeout(reconnectTimer.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return stats;
}
