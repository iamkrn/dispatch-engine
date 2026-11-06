export interface Reservations {
  reserve(agentId: string, requestId: string): void;
  release(agentId: string): void;
  releaseByRequest(requestId: string): void;
  isReserved(agentId: string): boolean;
  readonly size: number;
}

export function createReservations(): Reservations {
  const byAgent = new Map<string, string>();

  return {
    reserve(agentId, requestId) {
      byAgent.set(agentId, requestId);
    },
    release(agentId) {
      byAgent.delete(agentId);
    },
    releaseByRequest(requestId) {
      for (const [agentId, rid] of byAgent) {
        if (rid === requestId) byAgent.delete(agentId);
      }
    },
    isReserved(agentId) {
      return byAgent.has(agentId);
    },
    get size() {
      return byAgent.size;
    },
  };
}