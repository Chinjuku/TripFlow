/**
 * Pure helpers, types, and constants for the plan-page map. Kept out of the
 * component tree per the refactor rules — the map component + its hooks import
 * from here.
 */

/** A POI preview shown in the map's InfoWindow popup. */
export interface PoiPreview {
  placeId: string;
  name: string;
  address: string | null;
  category: string | null;
  lat: number;
  lng: number;
  photoUrl: string | null;
  rating: number | null;
  openingHoursText: string | null;
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
    /* quota / private-mode — fail open. */
  }
}

/**
 * Pans so the InfoWindow anchored on (lat, lng) ends up vertically centred.
 * Google's InfoWindow grows upward from its anchor, so we push the POI toward
 * the lower-middle of the viewport — the popup then lands near the centre.
 */
export function centerOnPoi(map: google.maps.Map, lat: number, lng: number): void {
  map.panTo({ lat, lng });
  window.setTimeout(() => {
    const viewportH = map.getDiv()?.clientHeight ?? 0;
    const offset = Math.min(Math.max(viewportH * 0.2, 80), 160);
    map.panBy(0, -offset);
  }, 0);
}

/** Today's human-readable opening hours from a Google OpeningHours object. */
export function openingHoursSummary(
  hours: google.maps.places.OpeningHours | null,
): string | null {
  if (!hours) return null;
  const today = new Date().getDay();
  const idx = (today + 6) % 7; // Google lists Mon-first.
  const desc = hours.weekdayDescriptions?.[idx];
  if (!desc) return null;
  const colon = desc.indexOf(':');
  return colon >= 0 ? desc.slice(colon + 1).trim() : desc;
}
