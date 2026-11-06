import { ScatterplotLayer } from '@deck.gl/layers';
import { MapboxOverlay } from '@deck.gl/mapbox';
import type { Agent, Request as DispatchRequest } from '@dispatch/shared';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';

const AMRITSAR_CENTER: [number, number] = [74.8723, 31.634];
const MAP_STYLE = 'https://demotiles.maplibre.org/style.json';

const AMBULANCE_COLOR: [number, number, number] = [239, 68, 68];
const CAB_COLOR: [number, number, number] = [59, 130, 246];
const BUSY_COLOR: [number, number, number] = [250, 204, 21];

const REQUEST_COLORS: Record<string, [number, number, number]> = {
  pending: [245, 158, 11],
  assigned: [34, 197, 94],
  in_progress: [168, 85, 247],
};

interface MapViewProps {
  agents: Agent[];
  requests: DispatchRequest[];
}

export function MapView({ agents, requests }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);

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

  useEffect(() => {
    overlayRef.current?.setProps({
      layers: [
        new ScatterplotLayer<Agent>({
          id: 'agents',
          data: agents,
          getPosition: (a) => [a.location.lng, a.location.lat],
           getFillColor: (a) =>
            a.status === 'busy'
              ? BUSY_COLOR
              : a.type === 'ambulance'
              ? AMBULANCE_COLOR
              : CAB_COLOR,
          radiusUnits: 'pixels',
          getRadius: 4,
          radiusMinPixels: 3,
          transitions: {
            getPosition: { duration: 1000, easing: (t: number) => t },
          },
        }),
        new ScatterplotLayer<DispatchRequest>({
          id: 'requests',
          data: requests,
          getPosition: (r) => [r.location.lng, r.location.lat],
          getFillColor: (r) => REQUEST_COLORS[r.status] ?? [0, 0, 0],
          getLineColor: [255, 255, 255],
          stroked: true,
          lineWidthUnits: 'pixels',
          getLineWidth: 2,
          radiusUnits: 'pixels',
          getRadius: 10,
          updateTriggers: { getFillColor: requests.map((r) => r.status).join() },
        }),
      ],
    });
  }, [agents, requests]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}