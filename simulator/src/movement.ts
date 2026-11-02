import type { CityConfig } from './config/city.js';
import type { SimAgent } from './agentState.js';
import { bearingDeg, distanceMeters, moveToward } from './geoMath.js';
import type { Rng } from './rng.js';
import { randomPointInCity } from './spawn.js';

const MAX_LEGS_PER_TICK = 5;

// Agent ko dtSec seconds aage badhata hai. In-place mutate karta hai.
export function stepAgent(
  agent: SimAgent,
  dtSec: number,
  now: number,
  city: CityConfig,
  rng: Rng,
): void {
  if (agent.status === 'offline') return;

  let remaining = ((agent.speedKmh * 1000) / 3600) * dtSec;

  // Loop isliye: ek tick mein target pe pahunch ke naye target ki taraf bhi chal sakta hai
  for (let leg = 0; leg < MAX_LEGS_PER_TICK && remaining > 0; leg++) {
    const dist = distanceMeters(agent.location, agent.target);

    if (dist <= remaining) {
      agent.location = { lat: agent.target.lat, lng: agent.target.lng };
      remaining -= dist;
      agent.target = randomPointInCity(city, rng);
    } else {
      agent.location = moveToward(agent.location, agent.target, remaining);
      remaining = 0;
    }
  }

  agent.headingDeg = bearingDeg(agent.location, agent.target);
  agent.lastUpdateAt = now;
}