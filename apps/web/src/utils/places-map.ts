/**
 * Pure helpers, types, and constants for the plan-page map. Kept out of the
 * component tree per the refactor rules - the map component + its hooks import
 * from here.
 */

/**
 * One open→close window in a place's weekly schedule. `day` is 0=Sunday..6=Saturday
 * (matches JS Date.getDay()); `open`/`close` are "HH:MM" local time. Windows that
 * cross midnight have a `close` that may read "24:00" or later (callers clamp).
 */
export interface OpeningPeriod {
  day: number;
  open: string;
  close: string;
}

/** A POI preview shown in the map's InfoWindow popup. */
export interface PoiPreview {
  placeId: string;
  name: string;
  address: string | null;
  /** English copies fetched alongside the localized ones, so the persisted
   *  snapshot carries both languages. Null until the second fetch resolves. */
  nameEn: string | null;
  addressEn: string | null;
  category: string | null;
  lat: number;
  lng: number;
  photoUrl: string | null;
  rating: number | null;
  openingHoursText: string | null;
  /** Machine-readable weekly hours, persisted for the scheduler's open/closed
   *  check. Null until enriched / unknown. */
  openingPeriods: OpeningPeriod[] | null;
}

/** A single user review shown in the place-detail modal. */
export interface PlaceReview {
  author: string;
  authorPhotoUrl: string | null;
  rating: number | null;
  text: string;
  relativeTime: string | null;
}

/** Full place detail for the deep-dive modal (fetched on demand). */
export interface PlaceDetail {
  name: string;
  address: string | null;
  rating: number | null;
  ratingCount: number | null;
  phone: string | null;
  website: string | null;
  googleMapsUri: string | null;
  /** All weekday opening-hours lines, e.g. "Monday: 9 AM – 6 PM". */
  hours: string[];
  photoUrls: string[];
  reviews: PlaceReview[];
}

/** Partial info used to paint a POI popup before details arrive. */
export interface PoiSeed {
  lat: number;
  lng: number;
  name?: string;
  rating?: number | null;
  category?: string | null;
}

/** A text/nearby search result rendered as a temporary map pin. */
export interface SearchHit {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  rating: number | null;
  category: string | null;
}

export const DEFAULT_CENTER = { lat: 13.7563, lng: 100.5018 }; // Bangkok
export const DEFAULT_ZOOM = 12;
export const MAP_ID = 'tripflow-plan-map';

/** localStorage key + cap for the recent-search dropdown. */
const RECENT_SEARCHES_KEY = 'tripflow.placesmap.recent';
export const RECENT_SEARCHES_LIMIT = 5;

export function loadRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

export function saveRecentSearches(list: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(list));
  } catch {
    /* quota / private-mode - fail open. */
  }
}

/**
 * Pans so the InfoWindow anchored on (lat, lng) ends up vertically centred.
 * Google's InfoWindow grows upward from its anchor, so we push the POI toward
 * the lower-middle of the viewport - the popup then lands near the centre.
 */
export function centerOnPoi(map: google.maps.Map, lat: number, lng: number): void {
  map.panTo({ lat, lng });
  window.setTimeout(() => {
    const viewportH = map.getDiv()?.clientHeight ?? 0;
    const offset = Math.min(Math.max(viewportH * 0.2, 80), 160);
    map.panBy(0, -offset);
  }, 0);
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * Flattens Google's `regularOpeningHours.periods` into our `OpeningPeriod[]`.
 * Each window is keyed by its open day (0=Sun..6=Sat). A null `close` means the
 * place is open that whole day → "00:00"–"24:00". A window crossing midnight
 * (close.day ≠ open.day) keeps the open day with a close past "24:00" so the
 * scheduler can still match an early-morning slot. Returns null when there are
 * no usable periods (unknown / always-open) so callers skip the check.
 */
export function serializeOpeningPeriods(
  hours: google.maps.places.OpeningHours | null | undefined,
): OpeningPeriod[] | null {
  const periods = hours?.periods;
  if (!periods || periods.length === 0) return null;

  const out: OpeningPeriod[] = [];
  for (const p of periods) {
    if (!p.open) continue;
    const open = `${pad2(p.open.hour)}:${pad2(p.open.minute)}`;
    if (!p.close) {
      out.push({ day: p.open.day, open: '00:00', close: '24:00' });
      continue;
    }
    // Days past the open day add 24h per day so a Mon 22:00→Tue 02:00 window
    // reads as "22:00"–"26:00" on Monday.
    const dayDelta = (p.close.day - p.open.day + 7) % 7;
    const closeHour = p.close.hour + dayDelta * 24;
    out.push({ day: p.open.day, open, close: `${pad2(closeHour)}:${pad2(p.close.minute)}` });
  }
  return out.length > 0 ? out : null;
}

/** Today's human-readable opening hours from a Google OpeningHours object. */
export function openingHoursSummary(hours: google.maps.places.OpeningHours | null): string | null {
  if (!hours) return null;
  const today = new Date().getDay();
  const idx = (today + 6) % 7; // Google lists Mon-first.
  const desc = hours.weekdayDescriptions?.[idx];
  if (!desc) return null;
  const colon = desc.indexOf(':');
  return colon >= 0 ? desc.slice(colon + 1).trim() : desc;
}

/**
 * Trims the leading premise (house number, sub-numbers, หมู่ที่/Moo) off a
 * Thai formatted address so vote cards show a tighter "road → province" scope.
 * Cuts at the first road/locality token; falls back to the full string when
 * none is found (e.g. a place with no street component).
 */
export function shortAddress(address: string): string {
  // First of: road (ถ./ถนน/Rd), sub-district (ตำบล/ต./แขวง), or English road.
  const match = address.match(/(ถนน|ถ\.|ตำบล|ต\.|แขวง|\b(?:Rd|Road)\b)/);
  if (!match || match.index === undefined || match.index === 0) return address;
  return address.slice(match.index).trim();
}

/**
 * Picks the copy matching the current UI language, falling back to the other
 * when the chosen one is missing (older rows only have the primary/Thai copy).
 * `lang` is the i18n language code; anything starting with "en" prefers English.
 */
export function localized(
  lang: string,
  primary: string | null | undefined,
  english: string | null | undefined,
): string | null {
  const wantsEn = lang.startsWith('en');
  const first = wantsEn ? english : primary;
  return (first ?? primary ?? english) || null;
}

/** Bare host for display ("https://www.foo.com/x" → "foo.com"); echoes input on failure. */
export function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
