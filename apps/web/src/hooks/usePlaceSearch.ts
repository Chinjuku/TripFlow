import { useCallback, useEffect, useRef, useState } from 'react';
import {
  loadRecentSearches,
  saveRecentSearches,
  RECENT_SEARCHES_LIMIT,
  type SearchHit,
} from '@/utils/places-map';

/** What the last search was, so "Search this area" can repeat it. */
type LastSearch = { kind: 'text'; query: string } | { kind: 'nearby'; includedType: string } | null;

interface UsePlaceSearchResult {
  hits: SearchHit[];
  searching: boolean;
  recent: string[];
  showSearchHere: boolean;
  runText: (query: string) => void;
  runNearby: (includedType: string) => void;
  searchHere: () => void;
  clear: () => void;
  clearRecent: () => void;
}

/**
 * Owns place search on the map: text + category(nearby) queries, the recent-
 * search list (localStorage), and the "Search this area" CTA that appears once
 * the user pans after a search. `center` is the destination fallback used to
 * bias the very first text search before the viewport is established.
 */
export function usePlaceSearch(
  map: google.maps.Map | null,
  placesLib: google.maps.PlacesLibrary | null,
  center: { lat: number; lng: number } | null | undefined,
): UsePlaceSearchResult {
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [recent, setRecent] = useState<string[]>(() => loadRecentSearches());
  const [showSearchHere, setShowSearchHere] = useState(false);
  const lastRef = useRef<LastSearch>(null);

  const applyHits = useCallback(
    (results: google.maps.places.Place[]) => {
      if (!map) return;
      const next: SearchHit[] = [];
      const bounds = new google.maps.LatLngBounds();
      for (const r of results) {
        if (!r.id || !r.location || !r.displayName) continue;
        next.push({
          placeId: r.id,
          name: r.displayName,
          lat: r.location.lat(),
          lng: r.location.lng(),
          rating: r.rating ?? null,
          category: r.types?.[0] ?? null,
        });
        bounds.extend(r.location);
      }
      setHits(next);
      if (next.length > 0) map.fitBounds(bounds, 60);
    },
    [map],
  );

  const pushRecent = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setRecent((prev) => {
      const next = [
        trimmed,
        ...prev.filter((q) => q.toLowerCase() !== trimmed.toLowerCase()),
      ].slice(0, RECENT_SEARCHES_LIMIT);
      saveRecentSearches(next);
      return next;
    });
  }, []);

  const runText = useCallback(
    (query: string) => {
      if (!placesLib || !map || !query.trim()) return;
      setSearching(true);
      setShowSearchHere(false);
      lastRef.current = { kind: 'text', query };
      pushRecent(query);
      void (async () => {
        try {
          const { places: results } = await placesLib.Place.searchByText({
            textQuery: query,
            locationBias: map.getBounds() ?? (center ? { center, radius: 20000 } : undefined),
            fields: ['id', 'displayName', 'location', 'rating', 'types'],
            maxResultCount: 20,
          });
          applyHits(results);
        } catch (err) {
          console.error('[places-map] search failed', err);
        } finally {
          setSearching(false);
        }
      })();
    },
    [placesLib, map, center, pushRecent, applyHits],
  );

  const runNearby = useCallback(
    (includedType: string) => {
      if (!placesLib || !map) return;
      const bounds = map.getBounds();
      if (!bounds) return;
      setSearching(true);
      setShowSearchHere(false);
      lastRef.current = { kind: 'nearby', includedType };
      void (async () => {
        try {
          const c = bounds.getCenter();
          const ne = bounds.getNorthEast();
          const radius = Math.min(
            google.maps.geometry?.spherical?.computeDistanceBetween?.(c, ne) ?? 4000,
            5000,
          );
          const { places: results } = await placesLib.Place.searchNearby({
            locationRestriction: { center: { lat: c.lat(), lng: c.lng() }, radius },
            includedPrimaryTypes: [includedType],
            fields: ['id', 'displayName', 'location', 'rating', 'types'],
            maxResultCount: 20,
          });
          applyHits(results);
        } catch (err) {
          console.error('[places-map] nearby search failed', err);
        } finally {
          setSearching(false);
        }
      })();
    },
    [placesLib, map, applyHits],
  );

  const searchHere = useCallback(() => {
    const last = lastRef.current;
    if (!last) return;
    if (last.kind === 'text') runText(last.query);
    else runNearby(last.includedType);
  }, [runText, runNearby]);

  const clear = useCallback(() => {
    setHits([]);
    setShowSearchHere(false);
    lastRef.current = null;
  }, []);

  const clearRecent = useCallback(() => {
    setRecent([]);
    saveRecentSearches([]);
  }, []);

  // Surface the "Search this area" CTA after a pan/zoom, once a search exists.
  useEffect(() => {
    if (!map) return;
    let timer: number | undefined;
    const listener = map.addListener('idle', () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (lastRef.current) setShowSearchHere(true);
      }, 200);
    });
    return () => {
      if (timer) window.clearTimeout(timer);
      listener.remove();
    };
  }, [map]);

  return {
    hits,
    searching,
    recent,
    showSearchHere,
    runText,
    runNearby,
    searchHere,
    clear,
    clearRecent,
  };
}
