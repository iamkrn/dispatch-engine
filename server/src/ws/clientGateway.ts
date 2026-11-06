import type { Server as HttpServer, IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import type { Request, ServerToClientMessage } from '@dispatch/shared';
import type { Logger } from 'pino';
import { WebSocketServer, WebSocket } from 'ws';
import type { AgentStore } from '../state/agentStore.js';

export const CLIENT_WS_PATH = '/ws/client';
const BROADCAST_MS = 1000;
const MAX_BUFFERED_BYTES = 1024 * 1024; 

export interface ClientGatewayOptions {
  server: HttpServer;
  logger: Logger;
  agentStore: Pick<AgentStore, 'getAll' | 'lastTick'>;
}

export interface ClientGateway {
  broadcastRequest(request: Request, reasons?: string[]): void;
  close(): Promise<void>;
}

export function createClientGateway(opts: ClientGatewayOptions): ClientGateway {
  const log = opts.logger.child({ component: 'client-gateway' });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });

  function onUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void {
    const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
    if (pathname !== CLIENT_WS_PATH) return;
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  }
  opts.server.on('upgrade', onUpgrade);

  wss.on('connection', (ws) => {
    log.info({ clients: wss.clients.size }, 'client connected');
    ws.on('error', (err) => log.error({ err }, 'client socket error'));
    ws.on('close', () => log.info({ clients: wss.clients.size }, 'client disconnected'));
  });

  let lastSentTick = -1;
  const timer = setInterval(() => {
    if (wss.clients.size === 0) return;
    const tick = opts.agentStore.lastTick;
    if (tick === lastSentTick) return; 
    lastSentTick = tick;

    const payload = JSON.stringify({
      type: 'agents.snapshot',
      tick,
      agents: opts.agentStore.getAll(),
    });
    for (const client of wss.clients) {
      if (client.readyState !== WebSocket.OPEN) continue;
      if (client.bufferedAmount > MAX_BUFFERED_BYTES) continue;
      client.send(payload);
    }
  }, BROADCAST_MS);

  return {
        broadcastRequest(request, reasons) {
      const message: ServerToClientMessage = {
        type: 'request.updated',
        request,
        ...(reasons ? { reasons } : {}),
      };
      const payload = JSON.stringify(message);
      for (const client of wss.clients) {
        if (client.readyState !== WebSocket.OPEN) continue;
        if (client.bufferedAmount > MAX_BUFFERED_BYTES) continue;
        client.send(payload);
      }
    },
    close() {
      clearInterval(timer);
      opts.server.off('upgrade', onUpgrade);
      for (const client of wss.clients) client.terminate();
      return new Promise((resolve) => wss.close(() => resolve()));
    },
  };
}