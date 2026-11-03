import { randomUUID } from 'node:crypto';
import type {
  AgentType,
  GeoPoint,
  Request,
  RequestPriority,
  RequestStatus,
  TenantId,
} from '@dispatch/shared';
import { assertTransition } from './stateMachine.js';

export interface CreateRequestInput {
  tenantId: TenantId;
  requiredType: AgentType;
  priority: RequestPriority;
  location: GeoPoint;
  requiredCapacity: number;
}

export interface RequestStore {
  create(input: CreateRequestInput): Request;
  get(tenantId: TenantId, id: string): Request | undefined;
  list(tenantId: TenantId, status?: RequestStatus): Request[];
  /** State machine ke rules se status badalta hai. Galat transition pe throw. */
  transition(
    tenantId: TenantId,
    id: string,
    to: RequestStatus,
    patch?: { assignedAgentId?: string | null },
  ): Request;
  readonly size: number;
}

export class RequestNotFoundError extends Error {
  constructor(id: string) {
    super(`Request not found: ${id}`);
    this.name = 'RequestNotFoundError';
  }
}

export function createRequestStore(now: () => number = Date.now): RequestStore {
  // tenantId -> (requestId -> Request)
  const byTenant = new Map<TenantId, Map<string, Request>>();
  let total = 0;

  function bucket(tenantId: TenantId): Map<string, Request> {
    let m = byTenant.get(tenantId);
    if (!m) {
      m = new Map();
      byTenant.set(tenantId, m);
    }
    return m;
  }

  return {
    create(input) {
      const t = now();
      const req: Request = {
        id: randomUUID(),
        tenantId: input.tenantId,
        requiredType: input.requiredType,
        priority: input.priority,
        status: 'pending',
        location: { lat: input.location.lat, lng: input.location.lng },
        requiredCapacity: input.requiredCapacity,
        createdAt: t,
        updatedAt: t,
        assignedAgentId: null,
      };
      bucket(input.tenantId).set(req.id, req);
      total++;
      return req;
    },

    get(tenantId, id) {
      return byTenant.get(tenantId)?.get(id);
    },

    list(tenantId, status) {
      const all = Array.from(byTenant.get(tenantId)?.values() ?? []);
      return status ? all.filter((r) => r.status === status) : all;
    },

    transition(tenantId, id, to, patch) {
      const current = byTenant.get(tenantId)?.get(id);
      if (!current) throw new RequestNotFoundError(id);
      assertTransition(current.status, to);

      const next: Request = {
        ...current,
        status: to,
        updatedAt: now(),
        assignedAgentId:
          patch && 'assignedAgentId' in patch
            ? (patch.assignedAgentId ?? null)
            : current.assignedAgentId,
      };
      byTenant.get(tenantId)!.set(id, next);
      return next;
    },

    get size() {
      return total;
    },
  };
}