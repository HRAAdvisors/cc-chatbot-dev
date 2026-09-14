'use client';
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

export interface DistrictCount {
  district: string;
  count: number;
}

interface Props {
  counts: DistrictCount[];
  districtOptions: Array<{ value: string; label: string }>;
}

const SOURCE_ID = 'commissioner-districts';
const FILL_LAYER = 'commissioner-districts-fill';
const LINE_LAYER = 'commissioner-districts-line';
const LABEL_LAYER = 'commissioner-districts-label';

// Single-hue sequential ramp (blue, light -> dark) for encoding message count
// by district — see the data-viz skill's reference palette. Never use a
// multi-hue/rainbow scale for a magnitude encoding.
const SEQUENTIAL_BLUE = [
  '#cde2fb', '#b7d3f6', '#9ec5f4', '#86b6ef', '#6da7ec', '#5598e7',
  '#3987e5', '#2a78d6', '#256abf', '#1c5cab', '#184f95', '#104281', '#0d366b',
];
const NO_DATA_COLOR = '#e1e0d9';

function colorForRatio(t: number): string {
  const idx = Math.round(t * (SEQUENTIAL_BLUE.length - 1));
  return SEQUENTIAL_BLUE[Math.max(0, Math.min(SEQUENTIAL_BLUE.length - 1, idx))];
}

export default function DistrictMap({ counts, districtOptions }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const countsRef = useRef(counts);
  const districtOptionsRef = useRef(districtOptions);
  useEffect(() => {
    countsRef.current = counts;
    districtOptionsRef.current = districtOptions;
  }, [counts, districtOptions]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY || '';
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-115.14, 36.17], // Las Vegas / Clark County
      zoom: 8.3,
    });
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    mapRef.current = map;

    map.on('load', () => {
      fetch('/commissioner_districts.geojson')
        .then(r => r.json())
        .then((geojson: GeoJSON.FeatureCollection) => {
          map.addSource(SOURCE_ID, { type: 'geojson', data: geojson });
          map.addLayer({ id: FILL_LAYER, type: 'fill', source: SOURCE_ID, paint: { 'fill-color': NO_DATA_COLOR, 'fill-opacity': 0.85 } });
          map.addLayer({ id: LINE_LAYER, type: 'line', source: SOURCE_ID, paint: { 'line-color': '#52514e', 'line-width': 1 } });
          map.addLayer({
            id: LABEL_LAYER,
            type: 'symbol',
            source: SOURCE_ID,
            layout: { 'text-field': ['get', 'COMMISSION'], 'text-size': 14 },
            paint: { 'text-color': '#0b0b0b', 'text-halo-color': '#fcfcfb', 'text-halo-width': 1.5 },
          });

          const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false });
          map.on('mousemove', FILL_LAYER, e => {
            map.getCanvas().style.cursor = 'pointer';
            const code = e.features?.[0]?.properties?.COMMISSION;
            if (!code) return;
            const label = districtOptionsRef.current.find(d => d.value === code)?.label ?? code;
            const count = countsRef.current.find(c => c.district === code)?.count ?? 0;
            popup.setLngLat(e.lngLat).setHTML(
              `<div style="font-size:12px"><div style="font-weight:600">${label}</div><div style="color:#64748b">${count} message${count === 1 ? '' : 's'}</div></div>`
            ).addTo(map);
          });
          map.on('mouseleave', FILL_LAYER, () => {
            map.getCanvas().style.cursor = '';
            popup.remove();
          });

          applyFillColors(map, countsRef.current);
        });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (map && map.getLayer(FILL_LAYER)) applyFillColors(map, counts);
  }, [counts]);

  return <div ref={containerRef} className="w-full h-full rounded-xl" />;
}

function applyFillColors(map: mapboxgl.Map, counts: DistrictCount[]) {
  const max = Math.max(1, ...counts.map(c => c.count));
  const expression: mapboxgl.Expression = ['match', ['get', 'COMMISSION']];
  for (const { district, count } of counts) {
    expression.push(district, colorForRatio(count / max));
  }
  expression.push(NO_DATA_COLOR);
  map.setPaintProperty(FILL_LAYER, 'fill-color', expression);
}
