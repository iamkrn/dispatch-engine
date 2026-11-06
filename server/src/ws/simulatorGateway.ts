import type { Server as HttpServer, IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import {
  simToServerMessageSchema,
  type GeoPoint,
  type ServerToSimMessage,
  type SimHello,
  type SimSnapshot,
} from '@dispatch/shared';
import type { Logger } from 'pino';
import { WebSocket, WebSocketServer, type RawData } from 'ws';

export const SIM_WS_PATH = '/ws/sim';
const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

export interface SimulatorGatewayOptions {
  server: HttpServer;
  logger: Logger;
  onSnapshot: (snapshot: SimSnapshot, hello: SimHello) => void;
}

export interface SimulatorGateway {
  dispatch(agentId: string, requestId: string, destination: GeoPoint): boolean;
  close(): Promise<void>;
}

export function createSimulatorGateway(
  opts: SimulatorGatewayOptions,
): SimulatorGateway {
  const log = opts.logger.child({ component: 'simulator-gateway' });
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: MAX_PAYLOAD_BYTES,
  });

  function onUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void {
    const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
    // Sirf apna path handle karo. Baaki paths ko baad mein dusra gateway lega.
    if (pathname !== SIM_WS_PATH) return;

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  }
  opts.server.on('upgrade', onUpgrade);

  let active: WebSocket | null = null;

  wss.on('connection', (ws: WebSocket) => {
    let hello: SimHello | null = null;
    let snapshots = 0;
    log.info('simulator connected');

    ws.on('message', (data: RawData, isBinary: boolean) => {
      if (isBinary) {
        ws.close(1003, 'binary not supported');
        return;
      }

      let json: unknown;
      try {
        json = JSON.parse(data.toString());
      } catch {
        log.warn('invalid JSON from simulator');
        ws.close(1007, 'invalid json');
        return;
      }

      const parsed = simToServerMessageSchema.safeParse(json);
      if (!parsed.success) {
        log.warn(
          { issues: parsed.error.issues.slice(0, 3) },
          'schema validation failed',
        );
        ws.close(1007, 'invalid message');
        return;
      }

      const msg = parsed.data;

      if (msg.type === 'sim.hello') {
        if (hello) return; // duplicate hello ignore
        hello = msg;
        active = ws;
        log.info(
          { simulatorId: msg.simulatorId, city: msg.city, agents: msg.agentCount },
          'simulator hello',
        );
        return;
      }

      // sim.snapshot
      if (!hello) {
        log.warn('snapshot before hello');
        ws.close(1008, 'hello required first');
        return;
      }
      snapshots++;
      if (snapshots % 10 === 0) {
        log.info(
          { tick: msg.tick, agents: msg.agents.length, snapshots },
          'snapshot received',
        );
      }
      opts.onSnapshot(msg, hello);
    });

    ws.on('error', (err) => log.error({ err }, 'socket error'));
    ws.on('close', () => {
      if (active === ws) active = null;
    });
    ws.on('close', (code, reason) =>
      log.info({ code, reason: reason.toString(), snapshots }, 'simulator disconnected'),
    );
  });

  return {
       dispatch(agentId, requestId, destination) {
      if (!active || active.readyState !== WebSocket.OPEN) return false;
      const message: ServerToSimMessage = {
        type: 'sim.dispatch',
        agentId,
        requestId,
        destination,
      };
      active.send(JSON.stringify(message));
      return true;
    },
    close() {
      opts.server.off('upgrade', onUpgrade);
      for (const client of wss.clients) client.terminate();
      return new Promise((resolve) => wss.close(() => resolve()));
    },
  };
}