import type { Agent, GeoPoint, Request } from '@dispatch/shared';
import type { RequestStore, CreateRequestInput } from '../requests/requestStore.js';
import type { NearbyResult } from '../spatial/gridIndex.js';
import { selectNearest } from './nearestSelector.js';
import type { Reservations } from './reservations.js';

const DEFAULT_SEARCH_RADII_M = [2_000, 5_000, 15_000] as const;

export interface DispatchDecision {
  request: Request;
  assigned: boolean;
  reasons: string[];
  agentId: string | null;
  distanceMeters: number | null;
}

export interface DispatchDeps {
  requestStore: RequestStore;
  findNearby: (center: GeoPoint, radiusMeters: number) => NearbyResult[];
  getAgent: (id: string) => Agent | undefined;
  reservations: Reservations;
  searchRadiiMeters?: readonly number[];
}

export function dispatchRequest(
  deps: DispatchDeps,
  input: CreateRequestInput,
): DispatchDecision {
  const radii = deps.searchRadiiMeters ?? DEFAULT_SEARCH_RADII_M;
  const created = deps.requestStore.create(input);
  const reasons: string[] = [`request ${created.id} created (priority ${created.priority})`];

  for (const radius of radii) {
    const candidates = deps.findNearby(created.location, radius).filter(
      (c) => !deps.reservations.isReserved(c.id),
    );
    reasons.push(`searched ${radius} m: ${candidates.length} agents nearby`);

    const sel = selectNearest(created, candidates, deps.getAgent);
    if (sel) {
      deps.reservations.reserve(sel.agent.id, created.id);
      const assigned = deps.requestStore.transition(
        created.tenantId,
        created.id,
        'assigned',
        { assignedAgentId: sel.agent.id },
      );
      reasons.push(
        `nearest eligible ${created.requiredType}: ${sel.agent.id} at ${Math.round(sel.distanceMeters)} m`,
      );
      return {
        request: assigned,
        assigned: true,
        reasons,
        agentId: sel.agent.id,
        distanceMeters: sel.distanceMeters,
      };
    }
  }

  reasons.push('no eligible agent found, request stays pending');
  return {
    request: created,
    assigned: false,
    reasons,
    agentId: null,
    distanceMeters: null,
  };
}