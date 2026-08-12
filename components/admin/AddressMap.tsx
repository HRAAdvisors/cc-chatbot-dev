'use client';
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

export interface AddressPoint {
  id: number;
  address_queried: string;
  intent: string;
  lat: number;
  long: number;
}

const INTENT_COLORS: Record<string, string> = {
  internet_offer: '#3b82f6',
  digital_equity: '#22c55e',
  other: '#94a3b8',
};

const INTENT_LABELS: Record<string, string> = {
  internet_offer: 'Internet Plans',
  digital_equity: 'Digital Resources',
  other: 'General',
};

export default function AddressMap({ points }: { points: AddressPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY || '';
    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-115.14, 36.17], // Las Vegas / Clark County
      zoom: 9,
    });
    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const addMarkers = () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = points.map(p => {
        const popup = new mapboxgl.Popup({ offset: 12 }).setHTML(
          `<div style="font-size:12px">
            <div style="font-weight:600">${INTENT_LABELS[p.intent] ?? p.intent}</div>
            <div style="color:#64748b">${p.address_queried}</div>
          </div>`
        );
        return new mapboxgl.Marker({ color: INTENT_COLORS[p.intent] ?? '#94a3b8' })
          .setLngLat([p.long, p.lat])
          .setPopup(popup)
          .addTo(map);
      });
    };

    if (map.isStyleLoaded()) addMarkers();
    else map.once('load', addMarkers);

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
    };
  }, [points]);

  return <div ref={containerRef} className="w-full h-full rounded-xl" />;
}
