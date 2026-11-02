import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { pingDb } from './db.js';
import { logger } from './logger.js';
import type { AgentStore } from './state/agentStore.js';

export interface AppDeps {
  agentStore: Pick<AgentStore, 'size' | 'lastTick' | 'lastSnapshotAt'>;
}

export function createApp(deps: AppDeps) {
  const app = express();
  app.disable('x-powered-by');

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

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'not_found' });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err }, 'unhandled error');
    res.status(500).json({ error: 'internal_error' });
  });

  return app;
}
