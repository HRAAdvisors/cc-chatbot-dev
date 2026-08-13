import sql from './db';
import { createTTLCache } from './cache';

// ─── Normalization ─────────────────────────────────────────────────────────

const STREET_ABBREVS: Record<string, string> = {
  AVENUE: 'AVE', STREET: 'ST', BOULEVARD: 'BLVD', DRIVE: 'DR',
  ROAD: 'RD', LANE: 'LN', COURT: 'CT', PLACE: 'PL', CIRCLE: 'CIR',
  HIGHWAY: 'HWY', PARKWAY: 'PKWY', SQUARE: 'SQ', LOOP: 'LOOP',
  NORTH: 'N', SOUTH: 'S', EAST: 'E', WEST: 'W',
};

const normalizeAddr = (str: string) => {
  let s = (str || '').toUpperCase().replace(/[.,#]/g, '').replace(/\s+/g, ' ').trim();
  for (const [full, abbr] of Object.entries(STREET_ABBREVS)) {
    s = s.replace(new RegExp(`\\b${full}\\b`, 'g'), abbr);
  }
  return s;
};

const normalizeCity = (str: string) =>
  (str || '').toUpperCase().replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();

const stripDirectional = (addr: string) => {
  const m = addr.match(/^(\d+)\s+(N|S|E|W)\s+(.+)$/);
  return m ? `${m[1]} ${m[3]}` : null;
};

// ─── Extraction ────────────────────────────────────────────────────────────

const SUFFIX_PAT = '(?:STREET|AVENUE|BOULEVARD|DRIVE|ROAD|LANE|COURT|PLACE|CIRCLE|HIGHWAY|PARKWAY|SQUARE|ST|AVE|BLVD|DR|RD|LN|CT|WAY|PL|CIR|HWY|PKWY|LOOP|SQ)';
const ADDR_RE          = new RegExp(`(\\d+[\\w\\s.#-]+?\\b${SUFFIX_PAT}\\.?)[\\s,]+([A-Za-z][A-Za-z\\s]+?)[\\s,]+\\b([A-Za-z]{2})\\b(?:[\\s,]+(\\d{5}))?`, 'i');
const CITY_NO_STATE_RE = new RegExp(`(\\d+[\\w\\s.#-]+?\\b${SUFFIX_PAT}\\.?)[\\s,]+([A-Za-z][A-Za-z\\s]+?)\\s*$`, 'i');
const BARE_ADDR_RE     = new RegExp(`(\\d+[\\w\\s.#-]+?\\b${SUFFIX_PAT}\\.?)\\s*$`, 'i');

export interface ParsedAddress {
  addr: string;
  addrAlt: string | null;
  city: string | null;
  state: string;
  zip: string;
}

export const extractAddress = (text: string): ParsedAddress | null => {
  const m = text.match(ADDR_RE);
  if (m) {
    const addr = normalizeAddr(m[1]);
    return { addr, addrAlt: stripDirectional(addr), city: normalizeCity(m[2]), state: m[3].toUpperCase(), zip: m[4] || '' };
  }
  const mc = text.match(CITY_NO_STATE_RE);
  if (mc) {
    const addr = normalizeAddr(mc[1]);
    return { addr, addrAlt: stripDirectional(addr), city: normalizeCity(mc[2]), state: 'NV', zip: '' };
  }
  const bare = text.match(BARE_ADDR_RE);
  if (bare) {
    const addr = normalizeAddr(bare[1]);
    return { addr, addrAlt: stripDirectional(addr), city: null, state: 'NV', zip: '' };
  }
  return null;
};

// ─── Geocode ───────────────────────────────────────────────────────────────

// Nominatim is the slowest, most rate-limited step in the address flow, and
// the same address is looked up repeatedly (lookup route, chat route's
// analytics fallback, session pivots) — cache results independently of any
// caller so those repeats never leave the process.
const GEOCODE_FOUND_TTL_MS = 24 * 60 * 60 * 1000;
const GEOCODE_NOT_FOUND_TTL_MS = 10 * 60 * 1000;
type GeocodeResult = { lat: number; lon: number } | null;
const geocodeCache = createTTLCache<GeocodeResult>(GEOCODE_FOUND_TTL_MS, 2000);

export const geocodeAddress = async (addr: string, city: string | null, state: string, zip: string) => {
  const parts = [addr, city, `${state} ${zip}`.trim()].filter(Boolean);
  const cacheKey = parts.join(', ');

  const cached = geocodeCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const q = encodeURIComponent(cacheKey);
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=us`;
  try {
    const res  = await fetch(url, { headers: { 'User-Agent': 'ClarkCountyDigitalEquityChatbot/2.0' } });
    const data = await res.json() as Array<{ lat: string; lon: string }>;
    const result: GeocodeResult = data.length > 0 ? { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) } : null;
    geocodeCache.set(cacheKey, result, result ? GEOCODE_FOUND_TTL_MS : GEOCODE_NOT_FOUND_TTL_MS);
    return result;
  } catch (e) {
    console.error('[geocode] error:', e);
    return null;
  }
};

// ─── Points lookup ─────────────────────────────────────────────────────────

export interface PointsRow {
  ADDR: string; CITY: string; STATE: string; ZIP: string;
  BLD_TYPE: string; BRANDNAMES: string; TECHBEST: string;
  TECHRULES: string; MAX_DL: string; MAX_UL: string;
  FIXEDCNT: string; CSCHOICE: string;
  LATITUDE: number; LONGITUDE: number;
}

export const searchPoints = async ({ addr, addrAlt, city, state, zip }: ParsedAddress): Promise<PointsRow | null> => {
  const candidates = [addr, addrAlt].filter(Boolean) as string[];
  for (const a of candidates) {
    let rows = city
      ? await sql`SELECT * FROM points WHERE addr=${a} AND state=${state} AND city=${city} LIMIT 1`
      : await sql`SELECT * FROM points WHERE addr=${a} AND state=${state} LIMIT 1`;
    if (!rows.length && zip)
      rows = await sql`SELECT * FROM points WHERE addr=${a} AND state=${state} AND zip=${zip} LIMIT 1`;
    if (rows.length) {
      const r = rows[0];
      return {
        ADDR: r.addr, CITY: r.city, STATE: r.state, ZIP: r.zip,
        BLD_TYPE: r.bld_type, BRANDNAMES: r.brandnames, TECHBEST: r.techbest,
        TECHRULES: r.techrules, MAX_DL: r.max_dl, MAX_UL: r.max_ul,
        FIXEDCNT: r.fixedcnt, CSCHOICE: r.cschoice,
        LATITUDE: r.lat, LONGITUDE: r.long,
      };
    }
  }
  return null;
};
