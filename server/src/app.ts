import { createRequestBodySchema, DEMO_TENANT_ID } from '@dispatch/shared';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { pingDb } from './db.js';
import { dispatchRequest } from './dispatch/dispatchService.js';
import { logger } from './logger.js';
import type { RequestStore } from './requests/requestStore.js';
import type { AgentStore } from './state/agentStore.js';

export interface AppDeps {
  agentStore: Pick<
    AgentStore,
    'size' | 'lastTick' | 'lastSnapshotAt' | 'findNearby' | 'get'
  >;
  requestStore: RequestStore;
}

export function createApp(deps: AppDeps) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '10kb' }));

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
        findNearby: (center, radius) =>
          deps.agentStore.findNearby(center, radius),
        getAgent: (id) => deps.agentStore.get(id),
      },
      { tenantId: DEMO_TENANT_ID, ...parsed.data },
    );
    res.status(decision.assigned ? 201 : 202).json(decision);
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