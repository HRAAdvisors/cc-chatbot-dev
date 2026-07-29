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
