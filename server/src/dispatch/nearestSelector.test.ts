import type { Agent, Request } from '@dispatch/shared';
import { describe, expect, it } from 'vitest';
import { isEligible, selectNearest } from './nearestSelector.js';

function agent(over: Partial<Agent> = {}): Agent {
  return {
    id: 'amb-1',
    tenantId: 'demo',
    type: 'ambulance',
    status: 'available',
    location: { lat: 31.634, lng: 74.8723 },
    speedKmh: 40,
    capacity: 1,
    currentLoad: 0,
    lastUpdateAt: 0,
    ...over,
  };
}

const REQ: Request = {
  id: 'r1',
  tenantId: 'demo',
  requiredType: 'ambulance',
  priority: 'high',
  status: 'pending',
  location: { lat: 31.634, lng: 74.8723 },
  requiredCapacity: 1,
  createdAt: 0,
  updatedAt: 0,
  assignedAgentId: null,
};

function lookup(list: Agent[]) {
  const m = new Map(list.map((a) => [a.id, a]));
  return (id: string) => m.get(id);
}

describe('isEligible', () => {
  it('accepts a matching available agent', () => {
    expect(isEligible(agent(), REQ)).toBe(true);
  });
  it('rejects busy or offline', () => {
    expect(isEligible(agent({ status: 'busy' }), REQ)).toBe(false);
    expect(isEligible(agent({ status: 'offline' }), REQ)).toBe(false);
  });
  it('rejects wrong type', () => {
    expect(isEligible(agent({ type: 'cab' }), REQ)).toBe(false);
  });
  it('rejects other tenant', () => {
    expect(isEligible(agent({ tenantId: 'other' }), REQ)).toBe(false);
  });
  it('rejects insufficient free capacity', () => {
    expect(isEligible(agent({ capacity: 2, currentLoad: 2 }), REQ)).toBe(false);
    expect(
      isEligible(agent({ capacity: 3, currentLoad: 1 }), { ...REQ, requiredCapacity: 3 }),
    ).toBe(false);
  });
});

describe('selectNearest', () => {
  it('picks the nearest eligible agent', () => {
    const a = agent({ id: 'a' });
    const b = agent({ id: 'b' });
    const sel = selectNearest(
      REQ,
      [
        { id: 'a', distanceMeters: 100 },
        { id: 'b', distanceMeters: 300 },
      ],
      lookup([a, b]),
    );
    expect(sel?.agent.id).toBe('a');
    expect(sel?.distanceMeters).toBe(100);
  });

  it('skips a nearer ineligible agent', () => {
    const near = agent({ id: 'near', status: 'busy' });
    const far = agent({ id: 'far' });
    const sel = selectNearest(
      REQ,
      [
        { id: 'near', distanceMeters: 50 },
        { id: 'far', distanceMeters: 900 },
      ],
      lookup([near, far]),
    );
    expect(sel?.agent.id).toBe('far');
  });

  it('returns null when nobody is eligible', () => {
    const a = agent({ id: 'a', type: 'cab' });
    expect(selectNearest(REQ, [{ id: 'a', distanceMeters: 10 }], lookup([a]))).toBeNull();
    expect(selectNearest(REQ, [], lookup([]))).toBeNull();
  });

  it('breaks distance ties by id, regardless of input order', () => {
    const a = agent({ id: 'a' });
    const b = agent({ id: 'b' });
    const forward = selectNearest(
      REQ,
      [
        { id: 'a', distanceMeters: 100 },
        { id: 'b', distanceMeters: 100 },
      ],
      lookup([a, b]),
    );
    const reversed = selectNearest(
      REQ,
      [
        { id: 'b', distanceMeters: 100 },
        { id: 'a', distanceMeters: 100 },
      ],
      lookup([a, b]),
    );
    expect(forward?.agent.id).toBe('a');
    expect(reversed?.agent.id).toBe('a');
  });

  it('ignores candidates missing from the lookup', () => {
    const b = agent({ id: 'b' });
    const sel = selectNearest(
      REQ,
      [
        { id: 'ghost', distanceMeters: 10 },
        { id: 'b', distanceMeters: 200 },
      ],
      lookup([b]),
    );
    expect(sel?.agent.id).toBe('b');
  });
});