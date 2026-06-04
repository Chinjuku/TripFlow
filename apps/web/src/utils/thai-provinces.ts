import provincesData from '@/data/thaiProvinces.json';

/**
 * Thailand's 77 provinces with the coordinates of each provincial capital.
 * Data lives in `src/data/thaiProvinces.json` (matching the thai-banks
 * pattern); this module exposes the typed array + a filter helper.
 *
 * The lat/lng feeds the plan map's initial centre + search bias when a trip
 * is anchored to a province - no Google Places call needed.
 */
export interface ThaiProvince {
  /** English name - stable key, also the English display label. */
  en: string;
  th: string;
  /** Provincial-capital coordinates (good enough for a map centre). */
  lat: number;
  lng: number;
}

export const THAI_PROVINCES = provincesData as ThaiProvince[];

/**
 * Filters provinces by a query against both English and Thai names
 * (case-insensitive substring). Empty query returns the full list.
 */
export function filterProvinces(query: string): ThaiProvince[] {
  const q = query.trim().toLowerCase();
  if (!q) return THAI_PROVINCES;
  return THAI_PROVINCES.filter((p) => p.en.toLowerCase().includes(q) || p.th.includes(q));
}
