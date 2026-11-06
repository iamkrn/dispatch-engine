import {
  serverToClientMessageSchema,
  type Agent,
  type Request as DispatchRequest,
} from '@dispatch/shared';
import { useEffect, useState } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://127.0.0.1:3000/ws/client';

export interface AgentStream {
  agents: Agent[];
  requests: DispatchRequest[];
  tick: number;
  connected: boolean;
}

export function useAgentStream(): AgentStream {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [requests, setRequests] = useState<Record<string, DispatchRequest>>({});
  const [tick, setTick] = useState(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let backoff = 500;
    let stopped = false;

    function connect(): void {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        backoff = 500;
        setConnected(true);
      };

      ws.onmessage = (ev) => {
        let json: unknown;
        try {
          json = JSON.parse(String(ev.data));
        } catch {
          return;
        }
        const parsed = serverToClientMessageSchema.safeParse(json);
        if (!parsed.success) return;
        const msg = parsed.data;
        if (msg.type === 'agents.snapshot') {
          setAgents(msg.agents);
          setTick(msg.tick);
        } else {
          setRequests((prev) => ({ ...prev, [msg.request.id]: msg.request }));
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (stopped) return;
        retry = setTimeout(connect, backoff);
        backoff = Math.min(backoff * 2, 10_000);
      };
    }

    connect();
    return () => {
      stopped = true;
      if (retry) clearTimeout(retry);
      ws?.close();
    };
  }, []);

  return { agents, requests: Object.values(requests), tick, connected };
}