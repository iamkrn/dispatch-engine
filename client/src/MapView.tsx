import { MapboxOverlay } from '@deck.gl/mapbox';
import { ScatterplotLayer } from '@deck.gl/layers';
import type { Agent } from '@dispatch/shared';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';

// Amritsar center (simulator ke city config jaisa)
const AMRITSAR_CENTER: [number, number] = [74.8723, 31.634]; // [lng, lat]

// Dev ke liye MapLibre ka free demo style. Production mein apna tile provider lagega.
const MAP_STYLE = 'https://demotiles.maplibre.org/style.json';

const AMBULANCE_COLOR: [number, number, number] = [239, 68, 68];
const CAB_COLOR: [number, number, number] = [59, 130, 246];

interface MapViewProps {
  agents: Agent[];
}

export function MapView({ agents }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);

  // Map aur overlay ek baar banta hai
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: AMRITSAR_CENTER,
      zoom: 11,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    const overlay = new MapboxOverlay({ layers: [] });
    map.addControl(overlay as unknown as maplibregl.IControl);
    overlayRef.current = overlay;

    return () => {
      overlayRef.current = null;
      map.remove();
    };
  }, []);

  // Agents badalne pe sirf layer update hoti hai, map dobara nahi banta
  useEffect(() => {
    overlayRef.current?.setProps({
      layers: [
        new ScatterplotLayer<Agent>({
          id: 'agents',
          data: agents,
          getPosition: (a) => [a.location.lng, a.location.lat],
          getFillColor: (a) =>
            a.type === 'ambulance' ? AMBULANCE_COLOR : CAB_COLOR,
          radiusUnits: 'pixels',
          getRadius: 4,
          radiusMinPixels: 3,
        }),
      ],
    });
  }, [agents]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}