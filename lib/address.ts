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

// Plain Levenshtein edit distance. Suffix words and street names here are
// always short (2-15 chars), so the unoptimized O(n*m) table is plenty fast
// for the handful of comparisons each extraction/correction does.
const levenshtein = (a: string, b: string): number => {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
};

const ALL_SUFFIXES = Array.from(new Set([...Object.keys(STREET_ABBREVS), ...Object.values(STREET_ABBREVS), 'WAY']));

// A misspelled street-type word (e.g. "coiurt" for "Court") used to sink
// extraction entirely, since the old regex only recognized exact spellings.
// Accept anything close enough by edit distance and return its canonical
// abbreviated form, so a single typo in the suffix reads the same as a
// correctly-spelled one.
const fuzzyMatchSuffix = (word: string): string | null => {
  const upper = word.toUpperCase();
  if (ALL_SUFFIXES.includes(upper)) return STREET_ABBREVS[upper] || upper;
  let best: string | null = null;
  let bestDist = Infinity;
  for (const suf of ALL_SUFFIXES) {
    if (Math.abs(suf.length - upper.length) > 2) continue;
    const d = levenshtein(upper, suf);
    if (d < bestDist) { bestDist = d; best = suf; }
  }
  const threshold = upper.length <= 4 ? 1 : 2;
  return best && bestDist <= threshold ? (STREET_ABBREVS[best] || best) : null;
};

const SUFFIX_WORD       = '([A-Za-z]{2,10})\\.?';
const ADDR_RE          = new RegExp(`(\\d+[\\w\\s.#-]+?)\\s+${SUFFIX_WORD}[\\s,]+([A-Za-z][A-Za-z\\s]+?)[\\s,]+\\b([A-Za-z]{2})\\b(?:[\\s,]+(\\d{5}))?`, 'i');
const CITY_NO_STATE_RE = new RegExp(`(\\d+[\\w\\s.#-]+?)\\s+${SUFFIX_WORD}[\\s,]+([A-Za-z][A-Za-z\\s]+?)(?:[\\s,]+(\\d{5}))?\\s*$`, 'i');
const BARE_ADDR_RE     = new RegExp(`(\\d+[\\w\\s.#-]+?)\\s+${SUFFIX_WORD}(?:[\\s,]+(\\d{5}))?\\s*$`, 'i');

export interface ParsedAddress {
  addr: string;
  addrAlt: string | null;
  city: string | null;
  state: string;
  zip: string;
}

export const extractAddress = (text: string): ParsedAddress | null => {
  const build = (street: string, suffix: string, city: string | null, state: string, zip: string): ParsedAddress => {
    const addr = normalizeAddr(`${street} ${suffix}`);
    return { addr, addrAlt: stripDirectional(addr), city, state, zip };
  };

  const m = text.match(ADDR_RE);
  if (m) {
    const suffix = fuzzyMatchSuffix(m[2]);
    if (suffix) return build(m[1], suffix, normalizeCity(m[3]), m[4].toUpperCase(), m[5] || '');
  }
  const mc = text.match(CITY_NO_STATE_RE);
  if (mc) {
    const suffix = fuzzyMatchSuffix(mc[2]);
    if (suffix) return build(mc[1], suffix, normalizeCity(mc[3]), 'NV', mc[4] || '');
  }
  const bare = text.match(BARE_ADDR_RE);
  if (bare) {
    const suffix = fuzzyMatchSuffix(bare[2]);
    if (suffix) return build(bare[1], suffix, null, 'NV', bare[3] || '');
  }
  return null;
};

const titleCase = (s: string) => s.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase());

// Fallback for the rare geocode match whose addressdetails don't decompose
// into house_number/road (e.g. a place-type result) — builds the "Did you
// mean...?" string from what we parsed out of the user's own text instead.
export const formatParsedAddress = ({ addr, city, state, zip }: ParsedAddress): string =>
  [titleCase(addr), [city ? titleCase(city) : '', [state, zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')]
    .filter(Boolean).join(', ');

// ─── Geocode ───────────────────────────────────────────────────────────────

// Nominatim is the slowest, most rate-limited step in the address flow, and
// the same address is looked up repeatedly (lookup route, chat route's
// analytics fallback, session pivots) — cache results independently of any
// caller so those repeats never leave the process.
const GEOCODE_FOUND_TTL_MS = 24 * 60 * 60 * 1000;
const GEOCODE_NOT_FOUND_TTL_MS = 10 * 60 * 1000;
type GeocodeResult = { lat: number; lon: number; formatted?: string } | null;
const geocodeCache = createTTLCache<GeocodeResult>(GEOCODE_FOUND_TTL_MS, 2000);

// Turns a full street-type word back into our short display form (e.g.
// "Street" -> "St") using the same abbreviation table as normalizeAddr,
// but title-cased for human display instead of upper-cased for matching.
const abbreviateForDisplay = (str: string) => {
  let s = str;
  for (const [full, abbr] of Object.entries(STREET_ABBREVS)) {
    s = s.replace(new RegExp(`\\b${full}\\b`, 'gi'), abbr.charAt(0) + abbr.slice(1).toLowerCase());
  }
  return s;
};

// Nominatim's addressdetails breaks a match into house_number/road/city/
// postcode etc. — building the confirmation string from these (rather than
// echoing the user's raw input) is what lets a missing/wrong ZIP or a
// shorthand city name get corrected in the "Did you mean ...?" prompt.
const formatGeocodedAddress = (a: Record<string, string>): string | undefined => {
  if (!a.house_number || !a.road) return undefined;
  const city = a.city || a.town || a.village || a.hamlet;
  const stateAbbr = a['ISO3166-2-lvl4']?.split('-')[1];
  const cityState = [city, [stateAbbr, a.postcode].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return [`${a.house_number} ${abbreviateForDisplay(a.road)}`, cityState].filter(Boolean).join(', ');
};

const nominatimSearch = async (query: string): Promise<GeocodeResult> => {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=us&addressdetails=1`;
  const res  = await fetch(url, { headers: { 'User-Agent': 'ClarkCountyDigitalEquityChatbot/2.0' } });
  const data = await res.json() as Array<{ lat: string; lon: string; address?: Record<string, string> }>;
  if (!data.length) return null;
  const { lat, lon, address } = data[0];
  return { lat: parseFloat(lat), lon: parseFloat(lon), formatted: address ? formatGeocodedAddress(address) : undefined };
};

export const geocodeAddress = async (addr: string, city: string | null, state: string, zip: string) => {
  const parts = [addr, city, `${state} ${zip}`.trim()].filter(Boolean);
  const cacheKey = parts.join(', ');

  const cached = geocodeCache.get(cacheKey);
  if (cached !== undefined) return cached;

  try {
    let result = await nominatimSearch(cacheKey);
    // Some Henderson/Las Vegas-area ZIPs (mailing city on the FCC dataset and
    // USPS records) fall inside unincorporated Clark County in OSM's actual
    // boundaries — Nominatim then can't resolve the address with that city
    // in the query at all, even though it's a real, mapped location. Retry
    // without the city before giving up.
    if (!result && city) {
      result = await nominatimSearch([addr, `${state} ${zip}`.trim()].filter(Boolean).join(', '));
    }
    // A ZIP the user typed (or that we inferred) can be stale or slightly off
    // even when the street/city/state are fine — Nominatim treats the ZIP as
    // exact rather than inferring the correct one the way Google does. Retry
    // without it so a good street+city still resolves.
    if (!result && zip) {
      result = await nominatimSearch([addr, city, state].filter(Boolean).join(', '));
    }
    // Last resort: street + state alone, in case the city itself is the
    // mismatch (e.g. a mailing city that OSM doesn't recognize for this
    // street at all).
    if (!result && city) {
      result = await nominatimSearch([addr, state].filter(Boolean).join(', '));
    }
    geocodeCache.set(cacheKey, result, result ? GEOCODE_FOUND_TTL_MS : GEOCODE_NOT_FOUND_TTL_MS);
    return result;
  } catch (e) {
    console.error('[geocode] error:', e);
    return null;
  }
};

// ─── Fuzzy street correction ──────────────────────────────────────────────

// A misspelled street name (e.g. "Sanfrd" for "Sanford") won't geocode and
// won't exact-match the FCC dataset either — Nominatim doesn't correct
// spelling, and searchPoints below only does `addr=`. Every point in the
// dataset that shares a house number with the parsed address is a cheap,
// tightly-scoped candidate set (the existing addr-leading btree index
// supports this as a prefix scan), so rank those by edit distance in
// process rather than needing a fuzzy-search DB extension.
const HOUSE_NUMBER_RE = /^(\d+)\s+(.+)$/;

export const fuzzyCorrectStreet = async (parsed: ParsedAddress): Promise<ParsedAddress | null> => {
  const m = parsed.addr.match(HOUSE_NUMBER_RE);
  if (!m) return null;
  const [, houseNum, street] = m;
  const prefix = `${houseNum} `;

  const candidates = parsed.city
    ? await sql`SELECT DISTINCT addr, city, zip FROM points WHERE addr LIKE ${prefix + '%'} AND state=${parsed.state} AND city=${parsed.city}`
    : await sql`SELECT DISTINCT addr, city, zip FROM points WHERE addr LIKE ${prefix + '%'} AND state=${parsed.state}`;
  if (!candidates.length) return null;

  let best: { addr: string; city: string; zip: string } | null = null;
  let bestDist = Infinity;
  for (const c of candidates) {
    const d = levenshtein(street, c.addr.slice(prefix.length));
    if (d < bestDist) { bestDist = d; best = c as { addr: string; city: string; zip: string }; }
  }
  // Roughly one typo allowed per 4 characters of the street name — enough
  // for "Sanfrd"/"Sanford" without matching two genuinely different streets.
  const threshold = Math.max(1, Math.round(street.length / 4));
  if (!best || bestDist === 0 || bestDist > threshold) return null;

  return {
    addr: best.addr, addrAlt: stripDirectional(best.addr),
    city: normalizeCity(best.city), state: parsed.state, zip: best.zip || parsed.zip,
  };
};

// ─── Nearby suggestions ────────────────────────────────────────────────────

// Degrees-per-mile is latitude-independent for lat, and varies with
// longitude, but at Clark County's latitude (~36N) a flat box of this size
// comfortably covers a ~10-mile radius without a DB-side geo extension —
// distances are computed precisely in JS afterward, so the box only needs
// to be a superset of candidates, not exact.
const NEARBY_BOX_DEGREES = 0.15;

export interface NearbyPoint { addr: string; city: string; state: string; zip: string; distanceMiles: number }

// Used when a geocoded address has no exact match in the FCC dataset — the
// nearest known points are cheap, concrete alternatives the user can try
// instead of guessing at spelling.
export const findNearbyPoints = async (lat: number, lon: number, limit = 5): Promise<NearbyPoint[]> => {
  const rows = await sql`
    SELECT DISTINCT addr, city, state, zip, lat, long FROM points
    WHERE lat BETWEEN ${lat - NEARBY_BOX_DEGREES} AND ${lat + NEARBY_BOX_DEGREES}
      AND long BETWEEN ${lon - NEARBY_BOX_DEGREES} AND ${lon + NEARBY_BOX_DEGREES}
  `;
  return rows
    .map(r => ({
      addr: r.addr, city: r.city, state: r.state, zip: r.zip,
      distanceMiles: haversineMiles(lat, lon, r.lat, r.long),
    }))
    .sort((a, b) => a.distanceMiles - b.distanceMiles)
    .slice(0, limit);
};

const haversineMiles = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R    = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a    = Math.sin(dLat / 2) ** 2
             + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
             * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
