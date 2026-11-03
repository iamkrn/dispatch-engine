import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';

// Amritsar center (simulator ke city config jaisa)
const AMRITSAR_CENTER: [number, number] = [74.8723, 31.634]; // [lng, lat]

// Dev ke liye MapLibre ka free demo style. Production mein apna tile provider lagega.
const MAP_STYLE = 'https://demotiles.maplibre.org/style.json';

export function MapView() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: AMRITSAR_CENTER,
      zoom: 11,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    return () => map.remove();
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}