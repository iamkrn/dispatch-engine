import type { Agent, SimSnapshot } from '@dispatch/shared';

export interface AgentStore {
  applySnapshot(snapshot: SimSnapshot): void;
  getAll(): Agent[];
  get(id: string): Agent | undefined;
  readonly size: number;
  readonly lastTick: number;
  readonly lastSnapshotAt: number;
}

export function createAgentStore(): AgentStore {
  let agents = new Map<string, Agent>();
  let lastTick = 0;
  let lastSnapshotAt = 0;

  return {
    applySnapshot(snapshot) {
      const next = new Map<string, Agent>();
      for (const a of snapshot.agents) next.set(a.id, a);
      agents = next;
      lastTick = snapshot.tick;
      lastSnapshotAt = Date.now();
    },
    getAll() {
      return Array.from(agents.values());
    },
    get(id) {
      return agents.get(id);
    },
    get size() {
      return agents.size;
    },
    get lastTick() {
      return lastTick;
    },
    get lastSnapshotAt() {
      return lastSnapshotAt;
    },
  };
}