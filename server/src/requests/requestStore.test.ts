import { describe, expect, it } from 'vitest';
import { InvalidTransitionError } from './stateMachine.js';
import {
  createRequestStore,
  RequestNotFoundError,
  type CreateRequestInput,
} from './requestStore.js';

const INPUT: CreateRequestInput = {
  tenantId: 'tenant-a',
  requiredType: 'ambulance',
  priority: 'high',
  location: { lat: 31.634, lng: 74.8723 },
  requiredCapacity: 1,
};

// Fake clock, taaki updatedAt ka test deterministic rahe
function fakeClock(start = 1000) {
  let t = start;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

describe('requestStore', () => {
  it('creates a pending request with no agent', () => {
    const clock = fakeClock();
    const store = createRequestStore(clock.now);
    const r = store.create(INPUT);

    expect(r.status).toBe('pending');
    expect(r.assignedAgentId).toBeNull();
    expect(r.createdAt).toBe(1000);
    expect(r.updatedAt).toBe(1000);
    expect(r.tenantId).toBe('tenant-a');
    expect(store.size).toBe(1);
  });

  it('gives each request a unique id', () => {
    const store = createRequestStore();
    const a = store.create(INPUT);
    const b = store.create(INPUT);
    expect(a.id).not.toBe(b.id);
  });

  it('isolates tenants: B cannot see A requests', () => {
    const store = createRequestStore();
    const a = store.create(INPUT);

    expect(store.get('tenant-a', a.id)).toBeDefined();
    expect(store.get('tenant-b', a.id)).toBeUndefined();
    expect(store.list('tenant-b')).toHaveLength(0);
    expect(store.list('tenant-a')).toHaveLength(1);
  });

  it('tenant B cannot transition tenant A request', () => {
    const store = createRequestStore();
    const a = store.create(INPUT);
    expect(() => store.transition('tenant-b', a.id, 'assigned')).toThrow(
      RequestNotFoundError,
    );
    expect(store.get('tenant-a', a.id)?.status).toBe('pending');
  });

  it('list filters by status', () => {
    const store = createRequestStore();
    const a = store.create(INPUT);
    store.create(INPUT);
    store.transition('tenant-a', a.id, 'assigned', { assignedAgentId: 'amb-1' });

    expect(store.list('tenant-a', 'pending')).toHaveLength(1);
    expect(store.list('tenant-a', 'assigned')).toHaveLength(1);
  });

  it('valid transition updates status, agent and updatedAt', () => {
    const clock = fakeClock();
    const store = createRequestStore(clock.now);
    const r = store.create(INPUT);

    clock.advance(500);
    const next = store.transition('tenant-a', r.id, 'assigned', {
      assignedAgentId: 'amb-1',
    });

    expect(next.status).toBe('assigned');
    expect(next.assignedAgentId).toBe('amb-1');
    expect(next.updatedAt).toBe(1500);
    expect(next.createdAt).toBe(1000);
  });

  it('invalid transition throws and leaves request unchanged', () => {
    const store = createRequestStore();
    const r = store.create(INPUT);

    expect(() => store.transition('tenant-a', r.id, 'completed')).toThrow(
      InvalidTransitionError,
    );
    expect(store.get('tenant-a', r.id)?.status).toBe('pending');
  });

  it('reassignment clears the agent (assigned -> pending)', () => {
    const store = createRequestStore();
    const r = store.create(INPUT);
    store.transition('tenant-a', r.id, 'assigned', { assignedAgentId: 'amb-1' });
    const back = store.transition('tenant-a', r.id, 'pending', {
      assignedAgentId: null,
    });

    expect(back.status).toBe('pending');
    expect(back.assignedAgentId).toBeNull();
  });

  it('transition without patch keeps the assigned agent', () => {
    const store = createRequestStore();
    const r = store.create(INPUT);
    store.transition('tenant-a', r.id, 'assigned', { assignedAgentId: 'amb-1' });
    const next = store.transition('tenant-a', r.id, 'in_progress');
    expect(next.assignedAgentId).toBe('amb-1');
  });

  it('unknown id throws RequestNotFoundError', () => {
    const store = createRequestStore();
    expect(() => store.transition('tenant-a', 'nope', 'assigned')).toThrow(
      RequestNotFoundError,
    );
  });
});