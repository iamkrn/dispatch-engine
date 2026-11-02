import {
  PROTOCOL_VERSION,
  type SimToServerMessage,
} from '@dispatch/shared';
import WebSocket from 'ws';

export interface ServerLinkOptions {
  url: string;
  simulatorId: string;
  city: string;
  agentCount: number;
}

export interface ServerLink {
  connect(): void;
  close(): void;
  send(msg: SimToServerMessage): boolean;
  readonly isConnected: boolean;
}

const BACKOFF_START_MS = 500;
const BACKOFF_MAX_MS = 10_000;
// Itna buffer pending ho to server slow hai, snapshot skip
const MAX_BUFFERED_BYTES = 1024 * 1024; // 1 MB

export function createServerLink(opts: ServerLinkOptions): ServerLink {
  let ws: WebSocket | null = null;
  let connected = false;
  let closedByUs = false;
  let backoffMs = BACKOFF_START_MS;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  function scheduleReconnect(): void {
    if (closedByUs || retryTimer) return;
    const jitter = Math.random() * 0.3 * backoffMs;
    const delay = Math.round(backoffMs + jitter);
    console.warn(`[link] reconnecting in ${delay} ms`);
    retryTimer = setTimeout(() => {
      retryTimer = null;
      connect();
    }, delay);
    backoffMs = Math.min(backoffMs * 2, BACKOFF_MAX_MS);
  }

  function connect(): void {
    if (closedByUs) return;
    const socket = new WebSocket(opts.url);
    ws = socket;

    socket.on('open', () => {
      connected = true;
      backoffMs = BACKOFF_START_MS;
      console.log(`[link] connected to ${opts.url}`);
      const hello: SimToServerMessage = {
        type: 'sim.hello',
        protocolVersion: PROTOCOL_VERSION,
        simulatorId: opts.simulatorId,
        city: opts.city,
        agentCount: opts.agentCount,
      };
      socket.send(JSON.stringify(hello));
    });

    socket.on('close', (code, reason) => {
      connected = false;
      console.warn(`[link] closed code=${code} reason=${reason.toString()}`);
      scheduleReconnect();
    });

    
    socket.on('error', (err) => {
      console.warn(`[link] error: ${err.message}`);
    });
  }

  return {
    connect,
    close() {
      closedByUs = true;
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = null;
      ws?.close(1000, 'simulator shutdown');
    },
    send(msg) {
      if (!ws || !connected || ws.readyState !== WebSocket.OPEN) return false;
      if (ws.bufferedAmount > MAX_BUFFERED_BYTES) return false;
      ws.send(JSON.stringify(msg));
      return true;
    },
    get isConnected() {
      return connected;
    },
  };
}