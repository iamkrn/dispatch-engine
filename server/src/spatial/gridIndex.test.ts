import type { GeoPoint } from '@dispatch/shared';
import { describe, expect, it } from 'vitest';
import { haversineMeters } from './distance.js';
import { createGridIndex } from './gridIndex.js';

// Amritsar ke aaspaas
const CENTER: GeoPoint = { lat: 31.634, lng: 74.8723 };

// Chhota seeded RNG, taaki test deterministic rahe
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('haversineMeters', () => {
  it('same point = 0', () => {
    expect(haversineMeters(CENTER, CENTER)).toBe(0);
  });

  it('0.01 deg latitude is about 1112 m', () => {
    const d = haversineMeters(CENTER, { lat: CENTER.lat + 0.01, lng: CENTER.lng });
    expect(d).toBeGreaterThan(1100);
    expect(d).toBeLessThan(1125);
  });
});

describe('gridIndex', () => {
  it('returns nearest first', () => {
    const idx = createGridIndex();
    idx.upsert('far', { lat: CENTER.lat + 0.008, lng: CENTER.lng });
    idx.upsert('near', { lat: CENTER.lat + 0.001, lng: CENTER.lng });
    idx.upsert('mid', { lat: CENTER.lat + 0.004, lng: CENTER.lng });

    const res = idx.queryRadius(CENTER, 5000);
    expect(res.map((r) => r.id)).toEqual(['near', 'mid', 'far']);
  });

  it('excludes agents outside the radius', () => {
    const idx = createGridIndex();
    idx.upsert('in', { lat: CENTER.lat + 0.002, lng: CENTER.lng }); // ~222 m
    idx.upsert('out', { lat: CENTER.lat + 0.02, lng: CENTER.lng }); // ~2.2 km

    const res = idx.queryRadius(CENTER, 1000);
    expect(res.map((r) => r.id)).toEqual(['in']);
  });

  it('upsert moves an agent to a new position', () => {
    const idx = createGridIndex();
    idx.upsert('a', { lat: CENTER.lat + 0.001, lng: CENTER.lng });
    expect(idx.queryRadius(CENTER, 500)).toHaveLength(1);

    idx.upsert('a', { lat: CENTER.lat + 0.05, lng: CENTER.lng }); // bahut door
    expect(idx.queryRadius(CENTER, 500)).toHaveLength(0);
    expect(idx.size).toBe(1); // duplicate nahi bana
  });

  it('remove deletes the agent', () => {
    const idx = createGridIndex();
    idx.upsert('a', { lat: CENTER.lat + 0.001, lng: CENTER.lng });
    idx.remove('a');
    expect(idx.size).toBe(0);
    expect(idx.queryRadius(CENTER, 5000)).toHaveLength(0);
  });

  it('remove of unknown id does not throw', () => {
    const idx = createGridIndex();
    expect(() => idx.remove('ghost')).not.toThrow();
  });

  it('matches brute force on 2000 random agents', () => {
    const rand = rng(7);
    const idx = createGridIndex(500);
    const all: { id: string; p: GeoPoint }[] = [];

    for (let i = 0; i < 2000; i++) {
      const p: GeoPoint = {
        lat: 31.57 + rand() * 0.13,
        lng: 74.8 + rand() * 0.15,
      };
      all.push({ id: `a${i}`, p });
      idx.upsert(`a${i}`, p);
    }

    for (const radius of [300, 1000, 3000]) {
      for (let q = 0; q < 20; q++) {
        const center: GeoPoint = {
          lat: 31.57 + rand() * 0.13,
          lng: 74.8 + rand() * 0.15,
        };
        const expected = all
          .filter((a) => haversineMeters(center, a.p) <= radius)
          .map((a) => a.id)
          .sort();
        const got = idx
          .queryRadius(center, radius)
          .map((r) => r.id)
          .sort();
        expect(got).toEqual(expected);
      }
    }
  });
});