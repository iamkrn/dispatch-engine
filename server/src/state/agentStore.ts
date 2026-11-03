import type { Agent, GeoPoint, SimSnapshot } from '@dispatch/shared';
import { createGridIndex, type NearbyResult } from '../spatial/gridIndex.js';

export interface AgentStore {
  applySnapshot(snapshot: SimSnapshot): void;
  getAll(): Agent[];
  get(id: string): Agent | undefined;
  findNearby(center: GeoPoint, radiusMeters: number): NearbyResult[];
  readonly size: number;
  readonly lastTick: number;
  readonly lastSnapshotAt: number;
}

export function createAgentStore(): AgentStore {
  let agents = new Map<string, Agent>();
  const grid = createGridIndex();
  let lastTick = 0;
  let lastSnapshotAt = 0;

  return {
    applySnapshot(snapshot) {
      const next = new Map<string, Agent>();
      for (const a of snapshot.agents) next.set(a.id, a);
      for (const id of agents.keys()) {
        if (!next.has(id)) grid.remove(id);
      }
      for (const a of next.values()) grid.upsert(a.id, a.location);
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
    findNearby(center, radiusMeters) {
      return grid.queryRadius(center, radiusMeters);
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