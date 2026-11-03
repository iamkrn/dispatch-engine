import type { GeoPoint } from '@dispatch/shared';
import { haversineMeters } from './distance.js';

const METERS_PER_DEG_LAT = 111_320;

export interface NearbyResult {
  id: string;
  distanceMeters: number;
}

interface Entry {
  point: GeoPoint;
  cellKey: string;
}

export interface GridIndex {
  /** Naya agent add ya purane ki position update. */
  upsert(id: string, point: GeoPoint): void;
  remove(id: string): void;
  /** Radius ke andar ke saare ids, nearest pehle. */
  queryRadius(center: GeoPoint, radiusMeters: number): NearbyResult[];
  readonly size: number;
}

export function createGridIndex(cellSizeMeters = 500): GridIndex {
  const cellDeg = cellSizeMeters / METERS_PER_DEG_LAT;
  const cells = new Map<string, Set<string>>();
  const entries = new Map<string, Entry>();

  function keyOf(row: number, col: number): string {
    return `${row}:${col}`;
  }

  function cellOf(p: GeoPoint): { row: number; col: number } {
    return { row: Math.floor(p.lat / cellDeg), col: Math.floor(p.lng / cellDeg) };
  }

  function removeFromCell(id: string, key: string): void {
    const set = cells.get(key);
    if (!set) return;
    set.delete(id);
    if (set.size === 0) cells.delete(key);
  }

  return {
    upsert(id, point) {
      const { row, col } = cellOf(point);
      const key = keyOf(row, col);
      const existing = entries.get(id);

      if (existing && existing.cellKey !== key) {
        removeFromCell(id, existing.cellKey);
      }
      let set = cells.get(key);
      if (!set) {
        set = new Set();
        cells.set(key, set);
      }
      set.add(id);
      entries.set(id, { point: { lat: point.lat, lng: point.lng }, cellKey: key });
    },

    remove(id) {
      const existing = entries.get(id);
      if (!existing) return;
      removeFromCell(id, existing.cellKey);
      entries.delete(id);
    },

    queryRadius(center, radiusMeters) {
      const dLat = radiusMeters / METERS_PER_DEG_LAT;
      const cosLat = Math.max(0.01, Math.cos((center.lat * Math.PI) / 180));
      const dLng = radiusMeters / (METERS_PER_DEG_LAT * cosLat);

      const minRow = Math.floor((center.lat - dLat) / cellDeg);
      const maxRow = Math.floor((center.lat + dLat) / cellDeg);
      const minCol = Math.floor((center.lng - dLng) / cellDeg);
      const maxCol = Math.floor((center.lng + dLng) / cellDeg);

      const results: NearbyResult[] = [];
      for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
          const set = cells.get(keyOf(row, col));
          if (!set) continue;
          for (const id of set) {
            const entry = entries.get(id);
            if (!entry) continue;
            const d = haversineMeters(center, entry.point);
            if (d <= radiusMeters) results.push({ id, distanceMeters: d });
          }
        }
      }
      results.sort((a, b) => a.distanceMeters - b.distanceMeters);
      return results;
    },

    get size() {
      return entries.size;
    },
  };
}