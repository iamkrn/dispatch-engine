import type { Agent, Request } from '@dispatch/shared';
import type { NearbyResult } from '../spatial/gridIndex.js';

export interface Selection {
  agent: Agent;
  distanceMeters: number;
}

export function isEligible(agent: Agent, request: Request): boolean {
  return (
    agent.tenantId === request.tenantId &&
    agent.status === 'available' &&
    agent.type === request.requiredType &&
    agent.capacity - agent.currentLoad >= request.requiredCapacity
  );
}

// candidates: grid se aaye (nearest pehle). getAgent: id se agent nikalne ke liye.
export function selectNearest(
  request: Request,
  candidates: readonly NearbyResult[],
  getAgent: (id: string) => Agent | undefined,
): Selection | null {
  let best: Selection | null = null;

  for (const c of candidates) {
    const agent = getAgent(c.id);
    if (!agent || !isEligible(agent, request)) continue;

    if (
      best === null ||
      c.distanceMeters < best.distanceMeters ||
      (c.distanceMeters === best.distanceMeters && agent.id < best.agent.id)
    ) {
      best = { agent, distanceMeters: c.distanceMeters };
    }
  }
  return best;
}