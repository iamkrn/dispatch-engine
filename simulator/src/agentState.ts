import type { Agent, GeoPoint } from '@dispatch/shared';

// Simulator ka internal agent. Wire format (Agent) + movement ki extra state.
export interface SimAgent extends Agent {
  target: GeoPoint;
  headingDeg: number;
  missionRequestId: string | null;
}

// Sirf shared schema ke fields bahar jaayenge. target/headingDeg leak nahi honge.
export function toWire(sim: SimAgent): Agent {
  return {
    id: sim.id,
    tenantId: sim.tenantId,
    type: sim.type,
    status: sim.status,
    location: sim.location,
    speedKmh: sim.speedKmh,
    capacity: sim.capacity,
    currentLoad: sim.currentLoad,
    lastUpdateAt: sim.lastUpdateAt,
  };
}