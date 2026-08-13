import { SERVICES } from './services';

const haversineMiles = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R    = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a    = Math.sin(dLat / 2) ** 2
             + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
             * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export interface ServiceWithDistance {
  name: string; type: string; phone: string; url: string;
  address: string; lat: number | null; long: number | null;
  description: string | null; languages: string;
  distanceMiles?: number;
}

export interface ServiceGroups {
  within1: ServiceWithDistance[];
  within5: ServiceWithDistance[];
  within10: ServiceWithDistance[];
  national: ServiceWithDistance[];
}

export const getServicesNearAddress = (userLat: number, userLon: number): ServiceGroups => {
  const national = SERVICES.filter(s => s.lat === null) as ServiceWithDistance[];
  const withDist = (SERVICES.filter(s => s.lat !== null) as ServiceWithDistance[])
    .map(s => ({ ...s, distanceMiles: haversineMiles(userLat, userLon, s.lat!, s.long!) }))
    .sort((a, b) => a.distanceMiles! - b.distanceMiles!);

  return {
    within1:  withDist.filter(s => s.distanceMiles! <= 1),
    within5:  withDist.filter(s => s.distanceMiles! > 1  && s.distanceMiles! <= 5),
    within10: withDist.filter(s => s.distanceMiles! > 5  && s.distanceMiles! <= 10),
    national,
  };
};

export const nationalServicesOnly = (): ServiceGroups => ({
  within1: [], within5: [], within10: [],
  national: SERVICES.filter(s => s.lat === null) as ServiceWithDistance[],
});

// within1/5/10 are already distance-sorted ascending; national has no
// meaningful distance so it's the fallback once the nearer tiers run out.
export const getTopServices = (groups: ServiceGroups, n = 3): ServiceWithDistance[] =>
  [...groups.within1, ...groups.within5, ...groups.within10, ...groups.national].slice(0, n);

// National/online services have no lat/long (see ./services.ts), so there's
// nowhere to show on a map.
export const getMapUrl = (service: ServiceWithDistance): string | null =>
  service.lat != null && service.long != null
    ? `https://www.google.com/maps/search/?api=1&query=${service.lat},${service.long}`
    : null;

export type ServiceTier = 'within1' | 'within5' | 'within10' | 'national';

export const flattenServiceGroups = (groups: ServiceGroups): Array<ServiceWithDistance & { tier: ServiceTier }> => [
  ...groups.within1.map(s => ({ ...s, tier: 'within1' as const })),
  ...groups.within5.map(s => ({ ...s, tier: 'within5' as const })),
  ...groups.within10.map(s => ({ ...s, tier: 'within10' as const })),
  ...groups.national.map(s => ({ ...s, tier: 'national' as const })),
];
