import type { Agent, GeoPoint } from '@dispatch/shared';
import { describe, expect, it } from 'vitest';
import { createRequestStore } from '../requests/requestStore.js';
import { createGridIndex } from '../spatial/gridIndex.js';
import { dispatchRequest } from './dispatchService.js';

const CENTER: GeoPoint = { lat: 31.634, lng: 74.8723 };

function agent(id: string, dLat: number, over: Partial<Agent> = {}): Agent {
  return {
    id,
    tenantId: 'demo',
    type: 'ambulance',
    status: 'available',
    location: { lat: CENTER.lat + dLat, lng: CENTER.lng },
    speedKmh: 40,
    capacity: 1,
    currentLoad: 0,
    lastUpdateAt: 0,
    ...over,
  };
}

function setup(agents: Agent[]) {
  const grid = createGridIndex();
  const map = new Map<string, Agent>();
  for (const a of agents) {
    grid.upsert(a.id, a.location);
    map.set(a.id, a);
  }
  const requestStore = createRequestStore();
  const deps = {
    requestStore,
    findNearby: (c: GeoPoint, r: number) => grid.queryRadius(c, r),
    getAgent: (id: string) => map.get(id),
  };
  return { deps, requestStore };
}

const INPUT = {
  tenantId: 'demo',
  requiredType: 'ambulance' as const,
  priority: 'high' as const,
  location: CENTER,
  requiredCapacity: 1,
};

describe('dispatchRequest', () => {
  it('assigns the nearest eligible agent and records reasons', () => {
    const { deps, requestStore } = setup([agent('far', 0.01), agent('near', 0.002)]);
    const d = dispatchRequest(deps, INPUT);

    expect(d.assigned).toBe(true);
    expect(d.agentId).toBe('near');
    expect(d.request.status).toBe('assigned');
    expect(d.request.assignedAgentId).toBe('near');
    expect(d.reasons.length).toBeGreaterThanOrEqual(3);
    expect(requestStore.get('demo', d.request.id)?.status).toBe('assigned');
  });

  it('expands the search radius when nobody is close', () => {
    // ~4.4 km door: 2 km radius mein nahi, 5 km mein milega
    const { deps } = setup([agent('far', 0.04)]);
    const d = dispatchRequest(deps, INPUT);

    expect(d.assigned).toBe(true);
    expect(d.agentId).toBe('far');
    expect(d.reasons.some((r) => r.includes('searched 2000 m: 0'))).toBe(true);
    expect(d.reasons.some((r) => r.includes('searched 5000 m: 1'))).toBe(true);
  });

  it('stays pending when no eligible agent exists', () => {
    const { deps } = setup([agent('cab-1', 0.001, { type: 'cab' })]);
    const d = dispatchRequest(deps, INPUT);

    expect(d.assigned).toBe(false);
    expect(d.agentId).toBeNull();
    expect(d.request.status).toBe('pending');
    expect(d.request.assignedAgentId).toBeNull();
  });

  it('never assigns an agent from another tenant', () => {
    const { deps } = setup([agent('other', 0.001, { tenantId: 'other' })]);
    const d = dispatchRequest(deps, INPUT);
    expect(d.assigned).toBe(false);
  });

  it('is deterministic: same input, same decision', () => {
    const agents = [agent('a', 0.003), agent('b', 0.003), agent('c', 0.005)];
    const first = dispatchRequest(setup(agents).deps, INPUT);
    const second = dispatchRequest(setup(agents).deps, INPUT);
    expect(first.agentId).toBe(second.agentId);
  });
});