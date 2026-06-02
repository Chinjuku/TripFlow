import { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import type { PlaceDetail, PlaceReview } from '@/utils/places-map';

interface UsePlaceDetailResult {
  detail: PlaceDetail | null;
  loading: boolean;
  error: boolean;
}

/**
 * Fetches the full Google Place detail for a place_id when `enabled`. Must be
 * rendered under an <APIProvider> (the detail modal wraps itself in one).
 * Caches per id for the hook's lifetime so reopening is instant.
 */
export function usePlaceDetail(placeId: string | null, enabled: boolean): UsePlaceDetailResult {
  const placesLib = useMapsLibrary('places');
  const [detail, setDetail] = useState<PlaceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const cacheRef = useRef<Map<string, PlaceDetail>>(new Map());

  useEffect(() => {
    if (!enabled || !placeId || !placesLib) return;

    const cached = cacheRef.current.get(placeId);
    if (cached) {
      setDetail(cached);
      setLoading(false);
      setError(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);
    setDetail(null);

    void (async () => {
      try {
        const place = new placesLib.Place({ id: placeId });
        await place.fetchFields({
          fields: [
            'displayName',
            'formattedAddress',
            'rating',
            'userRatingCount',
            'nationalPhoneNumber',
            'websiteURI',
            'googleMapsURI',
            'regularOpeningHours',
            'photos',
            'reviews',
          ],
        });
        if (cancelled) return;

        const reviews: PlaceReview[] = (place.reviews ?? []).slice(0, 4).map((r) => ({
          author: r.authorAttribution?.displayName ?? 'Anonymous',
          authorPhotoUrl: r.authorAttribution?.photoURI ?? null,
          rating: r.rating ?? null,
          text: r.text ?? '',
          relativeTime: r.relativePublishTimeDescription ?? null,
        }));

        const next: PlaceDetail = {
          name: place.displayName ?? 'Unknown place',
          address: place.formattedAddress ?? null,
          rating: place.rating ?? null,
          ratingCount: place.userRatingCount ?? null,
          phone: place.nationalPhoneNumber ?? null,
          website: place.websiteURI ?? null,
          googleMapsUri: place.googleMapsURI ?? null,
          hours: place.regularOpeningHours?.weekdayDescriptions ?? [],
          photoUrls: (place.photos ?? []).slice(0, 6).map((p) => p.getURI({ maxWidth: 800 })),
          reviews,
        };
        cacheRef.current.set(placeId, next);
        setDetail(next);
        setLoading(false);
      } catch (err) {
        console.error('[place-detail] fetch failed', err);
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [placeId, enabled, placesLib]);

  return { detail, loading, error };
}
