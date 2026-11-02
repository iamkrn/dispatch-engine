import type { GeoPoint } from '@dispatch/shared';
import type { CityConfig } from './config/city.js';
import type { SimAgent } from './agentState.js';
import { randomBetween, randomInt, type Rng } from './rng.js';

const AMBULANCE_RATIO = 0.2;

export function randomPointInCity(city: CityConfig, rng: Rng): GeoPoint {
  return {
    lat: randomBetween(rng, city.bounds.minLat, city.bounds.maxLat),
    lng: randomBetween(rng, city.bounds.minLng, city.bounds.maxLng),
  };
}

export function spawnAgents(
  count: number,
  city: CityConfig,
  rng: Rng,
  now: number,
): SimAgent[] {
  const agents: SimAgent[] = [];
  let ambCount = 0;
  let cabCount = 0;

  for (let i = 0; i < count; i++) {
    const isAmbulance = rng() < AMBULANCE_RATIO;

    let id: string;
    if (isAmbulance) {
      ambCount++;
      id = `amb-${String(ambCount).padStart(4, '0')}`;
    } else {
      cabCount++;
      id = `cab-${String(cabCount).padStart(4, '0')}`;
    }

    agents.push({
      id,
      type: isAmbulance ? 'ambulance' : 'cab',
      status: 'available',
      location: randomPointInCity(city, rng),
      speedKmh: Math.round(
        isAmbulance ? randomBetween(rng, 30, 60) : randomBetween(rng, 20, 50),
      ),
      capacity: isAmbulance ? 1 : randomInt(rng, 1, 4),
      currentLoad: 0,
      lastUpdateAt: now,
      target: randomPointInCity(city, rng),
      headingDeg: 0,
    });
  }

  return agents;
}