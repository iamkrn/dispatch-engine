import type { SimToServerMessage } from '@dispatch/shared';
import { toWire } from './agentState.js';
import { AMRITSAR } from './config/city.js';
import { stepAgent } from './movement.js';
import { createRng } from './rng.js';
import { createServerLink } from './serverLink.js';
import { spawnAgents } from './spawn.js';
import { createTickLoop } from './tickLoop.js';

const COUNT = 1000;
const SEED = 42;
const TICK_MS = 1000;
const DT_SEC = TICK_MS / 1000;
const REPORT_EVERY = 5; // ticks
// localhost nahi, 127.0.0.1 (Windows pe IPv6 wali dikkat)
const SERVER_WS_URL = process.env['SERVER_WS_URL'] ?? 'ws://127.0.0.1:3000/ws/sim';

const rng = createRng(SEED);
const agents = spawnAgents(COUNT, AMRITSAR, rng, Date.now());

const link = createServerLink({
  url: SERVER_WS_URL,
  simulatorId: 'sim-1',
  city: AMRITSAR.name,
  agentCount: agents.length,
});

const startedAt = performance.now();
let durationSum = 0;
let durationMax = 0;
let lagEvents = 0;
let sent = 0;
let skipped = 0;

const loop = createTickLoop({
  tickMs: TICK_MS,
  onTick(tick) {
    const t0 = performance.now();
    const now = Date.now();
    for (const a of agents) stepAgent(a, DT_SEC, now, AMRITSAR, rng);
    const took = performance.now() - t0;

    durationSum += took;
    durationMax = Math.max(durationMax, took);

    const snapshot: SimToServerMessage = {
      type: 'sim.snapshot',
      tick,
      sentAt: now,
      agents: agents.map(toWire),
    };
    if (link.send(snapshot)) sent++;
    else skipped++;

    if (tick % REPORT_EVERY === 0) {
      const elapsedMs = performance.now() - startedAt;
      const driftMs = elapsedMs - tick * TICK_MS;
      console.log(
        `tick=${tick} avg=${(durationSum / tick).toFixed(3)}ms max=${durationMax.toFixed(3)}ms ` +
          `drift=${driftMs.toFixed(1)}ms lag=${lagEvents} sent=${sent} skipped=${skipped} ` +
          `connected=${link.isConnected}`,
      );
    }
  },
  onLag(lagMs) {
    lagEvents++;
    console.warn(`Loop lagging by ${lagMs.toFixed(0)} ms, skipping ticks`);
  },
});

function shutdown(): void {
  loop.stop();
  link.close();
  console.log(`Simulator stopped after ${loop.tickCount} ticks (sent=${sent}, skipped=${skipped})`);
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log(`Simulator running: ${COUNT} agents in ${AMRITSAR.name}, tick=${TICK_MS}ms`);
link.connect();
loop.start();