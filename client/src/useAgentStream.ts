import type { Agent } from '@dispatch/shared';
import { useEffect, useState } from 'react';

const WS_URL =
  import.meta.env.VITE_WS_URL ?? 'ws://127.0.0.1:3000/ws/client';

interface AgentsMessage {
  type: 'agents.snapshot';
  tick: number;
  agents: Agent[];
}

export interface AgentStream {
  agents: Agent[];
  tick: number;
  connected: boolean;
}

export function useAgentStream(): AgentStream {
  const [state, setState] = useState<AgentStream>({
    agents: [],
    tick: 0,
    connected: false,
  });

  useEffect(() => {
    let ws: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let backoff = 500;
    let stopped = false;

    function connect(): void {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        backoff = 500;
        setState((s) => ({ ...s, connected: true }));
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as AgentsMessage;
          if (msg.type === 'agents.snapshot') {
            setState({ agents: msg.agents, tick: msg.tick, connected: true });
          }
        } catch {
          // kharab message ignore
        }
      };

      ws.onclose = () => {
        setState((s) => ({ ...s, connected: false }));
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

  return state;
}