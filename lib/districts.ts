import fs from 'fs';
import path from 'path';

// GeoJSON ring coordinates are [longitude, latitude] pairs — do not transpose.
type Ring = [number, number][];

interface DistrictFeature {
  properties: { COMMISSION: string; NAME: string };
  geometry: { type: 'Polygon'; coordinates: Ring[] };
}

const raw = fs.readFileSync(path.join(process.cwd(), 'public', 'commissioner_districts.geojson'), 'utf8');
const districts: DistrictFeature[] = JSON.parse(raw).features;

export const DISTRICT_OPTIONS = districts.map(f => ({ value: f.properties.COMMISSION, label: f.properties.NAME }));

// Standard ray-casting point-in-polygon test against a single ring.
function pointInRing(lon: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = (yi > lat) !== (yj > lat) &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function districtForPoint(lat: number | null | undefined, long: number | null | undefined): string | null {
  if (lat == null || long == null) return null;
  for (const feature of districts) {
    if (pointInRing(long, lat, feature.geometry.coordinates[0])) return feature.properties.COMMISSION;
  }
  return null;
}
