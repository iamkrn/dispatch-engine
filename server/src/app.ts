import {
  createRequestBodySchema,
   DEMO_TENANT_ID,
  updateRequestStatusBodySchema,
  type GeoPoint,
  type Request as DispatchRequest,
} from '@dispatch/shared';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { pingDb } from './db.js';
import { dispatchRequest } from './dispatch/dispatchService.js';
import { logger } from './logger.js';
import type { Reservations } from './dispatch/reservations.js';
import { RequestNotFoundError, type RequestStore } from './requests/requestStore.js';
import { InvalidTransitionError, isTerminal } from './requests/stateMachine.js';
import type { AgentStore } from './state/agentStore.js';

export interface AppDeps {
  agentStore: Pick<
    AgentStore,
    'size' | 'lastTick' | 'lastSnapshotAt' | 'findNearby' | 'get'
  >;
  requestStore: RequestStore;
  reservations: Reservations;
  onRequestUpdated: (request: DispatchRequest, reasons?: string[]) => void;
  onDispatch: (
    agentId: string,
    requestId: string,
    destination: GeoPoint,
  ) => void;
}

export function createApp(deps: AppDeps) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '10kb' }));

  const allowedOrigins = (
    process.env['CORS_ORIGINS'] ?? 'http://localhost:5173,http://127.0.0.1:5173'
  ).split(',');
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.get('/health', async (_req: Request, res: Response) => {
    const dbOk = await pingDb();
    res.status(dbOk ? 200 : 503).json({
      status: dbOk ? 'ok' : 'degraded',
      db: dbOk ? 'up' : 'down',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      agents: deps.agentStore.size,
      lastTick: deps.agentStore.lastTick,
      lastSnapshotAgeMs:
        deps.agentStore.lastSnapshotAt === 0
          ? null
          : Date.now() - deps.agentStore.lastSnapshotAt,
    });
  });

  app.post('/requests', (req: Request, res: Response) => {
    const parsed = createRequestBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'invalid_body', issues: parsed.error.issues });
      return;
    }
    const decision = dispatchRequest(
      {
        requestStore: deps.requestStore,
        reservations: deps.reservations,
        findNearby: (center, radius) =>
          deps.agentStore.findNearby(center, radius),
        getAgent: (id) => deps.agentStore.get(id),
      },
      { tenantId: DEMO_TENANT_ID, ...parsed.data },
    );
    deps.onRequestUpdated(decision.request, decision.reasons);
    if (decision.assigned && decision.agentId) {
      deps.onDispatch(
        decision.agentId,
        decision.request.id,
        decision.request.location,
      );
    }
    res.status(decision.assigned ? 201 : 202).json(decision);
  });

  app.patch('/requests/:id/status', (req: Request, res: Response) => {
    const parsed = updateRequestStatusBodySchema.safeParse(req.body);
    const id = req.params['id'];
    if (!parsed.success || typeof id !== 'string') {
      res.status(400).json({ error: 'invalid_body' });
      return;
    }
    try {
      const updated = deps.requestStore.transition(
        DEMO_TENANT_ID,
        id,
        parsed.data.status,
      );
      if (isTerminal(updated.status)) {
        deps.reservations.releaseByRequest(updated.id);
      }
      deps.onRequestUpdated(updated);
      res.json(updated);
    } catch (err) {
      if (err instanceof RequestNotFoundError) {
        res.status(404).json({ error: 'request_not_found' });
        return;
      }
      if (err instanceof InvalidTransitionError) {
        res.status(409).json({ error: 'invalid_transition', message: err.message });
        return;
      }
      throw err;
    }
  });

  if (process.env['NODE_ENV'] !== 'production') {
    app.get('/debug/nearby', (req: Request, res: Response) => {
      const lat = Number(req.query['lat']);
      const lng = Number(req.query['lng']);
      const radius = Number(req.query['radius'] ?? 1000);
      if (![lat, lng, radius].every(Number.isFinite) || radius <= 0) {
        res.status(400).json({ error: 'bad_params' });
        return;
      }
      const results = deps.agentStore.findNearby({ lat, lng }, radius);
      res.json({ count: results.length, results: results.slice(0, 10) });
    });
  }

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'not_found' });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err }, 'unhandled error');
    res.status(500).json({ error: 'internal_error' });
  });

  return app;
}