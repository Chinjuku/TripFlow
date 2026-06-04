import { useCallback, useRef, useState } from 'react';
import {
  centerOnPoi,
  openingHoursSummary,
  serializeOpeningPeriods,
  type PoiPreview,
  type PoiSeed,
} from '@/utils/places-map';

interface UsePoiPreviewResult {
  poi: PoiPreview | null;
  loading: boolean;
  /** Open a preview for a placeId, seeding from what we already know. */
  open: (placeId: string, seed?: PoiSeed) => void;
  close: () => void;
}

/**
 * Owns the map's POI preview: which place is shown, its loading state, and the
 * progressive fetch (cheap essentials first, then photos/rating). Caches
 * enriched previews by placeId so reopening is instant.
 *
 * On a fresh open it paints a seeded popup AND pans immediately, so the popup
 * is on-screen the moment you click - the details fetch only enriches it.
 */
export function usePoiPreview(
  map: google.maps.Map | null,
  placesLib: google.maps.PlacesLibrary | null,
): UsePoiPreviewResult {
  const [poi, setPoi] = useState<PoiPreview | null>(null);
  const [loading, setLoading] = useState(false);
  /** Monotonic guard so a slow fetch can't overwrite a newer click. */
  const reqRef = useRef(0);
  const cacheRef = useRef<Map<string, PoiPreview>>(new globalThis.Map());

  const close = useCallback(() => {
    reqRef.current++;
    setPoi(null);
    setLoading(false);
  }, []);

  const open = useCallback(
    (placeId: string, seed?: PoiSeed) => {
      if (!placesLib || !map) return;

      const cached = cacheRef.current.get(placeId);
      if (cached) {
        reqRef.current++;
        setPoi(cached);
        setLoading(false);
        centerOnPoi(map, cached.lat, cached.lng);
        return;
      }

      const reqId = ++reqRef.current;

      // Paint + pan immediately from the seed so the popup is visible at once.
      if (seed) {
        setPoi({
          placeId,
          name: seed.name ?? '…',
          address: null,
          nameEn: null,
          addressEn: null,
          category: seed.category ?? null,
          lat: seed.lat,
          lng: seed.lng,
          photoUrl: null,
          rating: seed.rating ?? null,
          openingHoursText: null,
          openingPeriods: null,
        });
        centerOnPoi(map, seed.lat, seed.lng);
      }
      setLoading(true);

      void (async () => {
        try {
          // Fetch the same essentials in both languages so the persisted
          // snapshot carries Thai (primary) + English copies, independent of
          // the UI language. The Thai request drives the popup geometry.
          const placeTh = new placesLib.Place({ id: placeId, requestedLanguage: 'th' });
          const placeEn = new placesLib.Place({ id: placeId, requestedLanguage: 'en' });
          const ESSENTIALS = ['id', 'displayName', 'formattedAddress', 'location', 'types'];

          const [, enResult] = await Promise.allSettled([
            placeTh.fetchFields({ fields: ESSENTIALS }),
            placeEn.fetchFields({ fields: ESSENTIALS }),
          ]);
          if (reqId !== reqRef.current) return;
          if (!placeTh.location) {
            setPoi(null);
            setLoading(false);
            return;
          }

          const enOk = enResult.status === 'fulfilled';
          const preview: PoiPreview = {
            placeId: placeTh.id ?? placeId,
            name: placeTh.displayName ?? 'Unknown place',
            address: placeTh.formattedAddress ?? null,
            nameEn: enOk ? (placeEn.displayName ?? null) : null,
            addressEn: enOk ? (placeEn.formattedAddress ?? null) : null,
            category: placeTh.types?.[0] ?? null,
            lat: placeTh.location.lat(),
            lng: placeTh.location.lng(),
            photoUrl: null,
            rating: null,
            openingHoursText: null,
            openingPeriods: null,
          };
          setPoi(preview);
          setLoading(false);
          centerOnPoi(map, preview.lat, preview.lng);
          // The Thai place handle drives the enrichment fetch below.
          const place = placeTh;

          // Pro/Enterprise fields - slower + pricier, fetched after the popup
          // is already on screen.
          await place.fetchFields({ fields: ['rating', 'regularOpeningHours', 'photos'] });
          if (reqId !== reqRef.current) return;
          const enriched: PoiPreview = {
            ...preview,
            photoUrl: place.photos?.[0]?.getURI({ maxWidth: 480 }) ?? null,
            rating: place.rating ?? null,
            openingHoursText: openingHoursSummary(place.regularOpeningHours ?? null),
            openingPeriods: serializeOpeningPeriods(place.regularOpeningHours),
          };
          cacheRef.current.set(placeId, enriched);
          setPoi((current) =>
            current && current.placeId === enriched.placeId ? enriched : current,
          );
        } catch (err) {
          console.error('[places-map] failed to load POI', err);
          if (reqId === reqRef.current) {
            setPoi(null);
            setLoading(false);
          }
        }
      })();
    },
    [placesLib, map],
  );

  return { poi, loading, open, close };
}
