import { useEffect, useMemo, useState } from 'react';
import {
  AdvancedMarker,
  APIProvider,
  InfoWindow,
  Map,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { MapPin, RotateCcw, ThumbsUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@trip-flow/ui/lib/cn';
import { bucketFor } from '@/utils/places';
import type { TripPlace } from '@/types/places';
import { DEFAULT_CENTER, DEFAULT_ZOOM, MAP_ID, type PoiPreview } from '@/utils/places-map';
import { usePoiPreview } from '@/hooks/usePoiPreview';
import { usePlaceSearch } from '@/hooks/usePlaceSearch';
import {
  CategoryFilterRow,
  MapTypeToggle,
  RecentSearchesDropdown,
  SearchBar,
  type MapTypeId,
} from './components/MapOverlays';
import { PoiPreviewCard } from './components/PoiPreviewCard';

export type { PoiPreview } from '@/utils/places-map';

interface PlacesMapProps {
  /** Picked places - rendered as our own branded markers. */
  places: TripPlace[];
  /** Set of Google place_ids already added - used to disable Add on the preview. */
  pickedExternalIds: Set<string>;
  /** Id of the picked place the user is hovering in the list (scales its marker up). */
  hoveredId: string | null;
  /** Fires when the user clicks a picked-place marker. */
  onPinClick: (placeId: string) => void;
  /** Fires when the user hovers a picked-place marker. */
  onPinHover: (placeId: string | null) => void;
  /** Fires when the user clicks "Add" inside a POI preview. Caller persists it. */
  onAddPoi: (poi: PoiPreview) => Promise<void> | void;
  /**
   * Trip's chosen destination centre (city / province) from create time.
   * Used as the initial map centre and the search bias fallback when no
   * places are picked yet. Null for trips created before destinations existed.
   */
  center?: { lat: number; lng: number } | null;
}

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

export function PlacesMap(props: PlacesMapProps) {
  if (!API_KEY) {
    return (
      <div className="border-border bg-card text-muted-foreground flex h-full w-full items-center justify-center rounded-2xl border p-6 text-center text-sm">
        <p className="max-w-[18rem]">
          Map disabled. Set <code className="font-mono text-xs">VITE_GOOGLE_MAPS_API_KEY</code> in
          your <code className="font-mono text-xs">.env</code> to enable place discovery.
        </p>
      </div>
    );
  }
  return <PlacesMapInner {...props} />;
}

function PlacesMapInner(props: PlacesMapProps) {
  // Controlled map-type lets us swap roadmap / satellite / terrain without
  // dropping into the Google default UI.
  const [mapTypeId, setMapTypeId] = useState<MapTypeId>('roadmap');
  const initialCenter = props.center ?? DEFAULT_CENTER;
  const { i18n } = useTranslation();
  // Localise Google's own labels (place names, addresses) to the app language.
  const language = i18n.language?.startsWith('th') ? 'th' : 'en';

  return (
    <div className="border-border bg-card relative h-full w-full overflow-hidden rounded-2xl border">
      <APIProvider apiKey={API_KEY!} language={language} region="TH">
        <Map
          defaultCenter={initialCenter}
          defaultZoom={DEFAULT_ZOOM}
          mapId={MAP_ID}
          mapTypeId={mapTypeId}
          gestureHandling="greedy"
          clickableIcons
          disableDefaultUI
          disableDoubleClickZoom
        >
          <MapBody {...props} />
          {/* Outside MapBody so it stays mounted while the inner map redraws. */}
          <MapTypeToggle value={mapTypeId} onChange={setMapTypeId} />
        </Map>
      </APIProvider>
    </div>
  );
}

function MapBody({
  places,
  pickedExternalIds,
  hoveredId,
  onPinClick,
  onPinHover,
  onAddPoi,
  center,
}: PlacesMapProps) {
  const { t } = useTranslation();
  const map = useMap();
  const placesLib = useMapsLibrary('places');

  const poi = usePoiPreview(map, placesLib);
  const search = usePlaceSearch(map, placesLib, center);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  const withCoords = useMemo(
    () =>
      places.filter(
        (p): p is TripPlace & { lat: number; lng: number } => p.lat !== null && p.lng !== null,
      ),
    [places],
  );

  /* Auto-fit on picked-places set change. */
  const fitSignature = useMemo(
    () =>
      withCoords
        .map((p) => `${p.id}:${p.lat.toFixed(4)},${p.lng.toFixed(4)}`)
        .sort()
        .join('|'),
    [withCoords],
  );

  useEffect(() => {
    if (!map) return;
    if (withCoords.length === 0) {
      if (center) map.panTo(center);
      return;
    }
    if (withCoords.length === 1) {
      map.panTo({ lat: withCoords[0]!.lat, lng: withCoords[0]!.lng });
      map.setZoom(14);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    withCoords.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
    map.fitBounds(bounds, 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, fitSignature, center?.lat, center?.lng]);

  /* Native Google POI click → open a preview seeded from the click point. */
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener('click', (e: google.maps.IconMouseEvent) => {
      const placeId = (e as { placeId?: string }).placeId;
      if (!placeId) {
        poi.close();
        return;
      }
      e.stop?.();
      const latLng = e.latLng;
      poi.open(placeId, latLng ? { lat: latLng.lat(), lng: latLng.lng() } : undefined);
    });
    return () => listener.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, poi.open, poi.close]);

  function clearSearch() {
    search.clear();
    setSearchQuery('');
    setActiveFilter(null);
  }

  function handleFilterClick(filter: { id: string; includedType: string }) {
    if (activeFilter === filter.id) {
      clearSearch();
      return;
    }
    setActiveFilter(filter.id);
    setSearchQuery('');
    search.runNearby(filter.includedType);
  }

  // Per-bucket gold/silver/bronze podium lookup for picked-place markers.
  const podium = useMemo(() => {
    const byBucket: Record<string, typeof withCoords> = {};
    for (const p of withCoords) {
      if (p.voteCount <= 0) continue;
      (byBucket[bucketFor(p.category)] ??= []).push(p);
    }
    const lookup: Record<string, 0 | 1 | 2> = {};
    for (const list of Object.values(byBucket)) {
      [...list]
        .sort((a, b) =>
          b.voteCount !== a.voteCount
            ? b.voteCount - a.voteCount
            : a.createdAt.localeCompare(b.createdAt),
        )
        .slice(0, 3)
        .forEach((p, i) => {
          lookup[p.id] = i as 0 | 1 | 2;
        });
    }
    return lookup;
  }, [withCoords]);

  return (
    <>
      {/* Search + filter overlay. */}
      <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-col gap-2">
        <div className="relative pointer-events-auto">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmit={() => {
              setActiveFilter(null);
              search.runText(searchQuery);
            }}
            onClear={clearSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => window.setTimeout(() => setSearchFocused(false), 150)}
            searching={search.searching}
            hasResults={search.hits.length > 0 || !!searchQuery}
          />
          {searchFocused && !searchQuery && search.recent.length > 0 && (
            <RecentSearchesDropdown
              items={search.recent}
              onPick={(q) => {
                setSearchQuery(q);
                setActiveFilter(null);
                search.runText(q);
              }}
              onClear={search.clearRecent}
            />
          )}
        </div>
        <CategoryFilterRow active={activeFilter} onClick={handleFilterClick} />
      </div>

      {/* "Search this area" - appears after a pan/zoom once a search exists. */}
      {search.showSearchHere && (
        <button
          type="button"
          onClick={search.searchHere}
          className="bg-card text-foreground border-border pointer-events-auto absolute left-1/2 top-28 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-md transition-colors hover:bg-muted"
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
          {t('plan.mapSearchHere')}
        </button>
      )}

      {/* Search result pins (below picked-place markers). */}
      {search.hits.map((hit) => (
        <AdvancedMarker
          key={`hit-${hit.placeId}`}
          position={{ lat: hit.lat, lng: hit.lng }}
          onClick={() =>
            poi.open(hit.placeId, {
              lat: hit.lat,
              lng: hit.lng,
              name: hit.name,
              rating: hit.rating,
              category: hit.category,
            })
          }
        >
          <div
            className="bg-primary border-primary-foreground text-primary-foreground ring-primary/30 flex h-8 w-8 items-center justify-center rounded-full border-2 shadow-lg ring-2 transition-transform hover:scale-110"
            aria-label={hit.name}
          >
            <MapPin className="h-4 w-4" strokeWidth={2.5} />
          </div>
        </AdvancedMarker>
      ))}

      {/* Picked-place markers - per-bucket podium tones. */}
      {withCoords.map((p) => {
        const hovered = hoveredId === p.id;
        const place = podium[p.id];
        return (
          <AdvancedMarker
            key={p.id}
            position={{ lat: p.lat, lng: p.lng }}
            onClick={() => onPinClick(p.id)}
          >
            <div
              onMouseEnter={() => onPinHover(p.id)}
              onMouseLeave={() => onPinHover(null)}
              className={cn(
                'inline-flex items-center justify-center gap-0.5 rounded-full border-2 font-bold shadow-lg transition-all',
                hovered ? 'h-9 px-2.5 text-sm' : 'h-7 px-2 text-xs',
                place === undefined && 'bg-primary text-primary-foreground border-primary',
                place === 0 &&
                  'bg-amber-400 text-amber-950 border-amber-600 ring-2 ring-white ring-offset-1 ring-offset-amber-600/40',
                place === 1 &&
                  'bg-slate-200 text-slate-900 border-slate-500 ring-2 ring-white ring-offset-1 ring-offset-slate-500/40',
                place === 2 &&
                  'bg-orange-500 text-orange-50 border-orange-700 ring-2 ring-white ring-offset-1 ring-offset-orange-700/40',
                hovered && 'scale-110',
              )}
            >
              <ThumbsUp className="h-3 w-3" strokeWidth={2.5} aria-hidden />
              <span className="tabular-nums">{p.voteCount}</span>
            </div>
          </AdvancedMarker>
        );
      })}

      {/* POI preview popup. `headerDisabled` removes Google's header chrome
          (the band + its close button) so our hero photo sits flush at the
          top; the card draws its own close button. */}
      {poi.poi && (
        <InfoWindow
          position={{ lat: poi.poi.lat, lng: poi.poi.lng }}
          onCloseClick={poi.close}
          pixelOffset={[0, -24]}
          headerDisabled
        >
          <PoiPreviewCard
            poi={poi.poi}
            loading={poi.loading}
            alreadyPicked={pickedExternalIds.has(poi.poi.placeId)}
            onClose={poi.close}
            onAdd={async () => {
              await onAddPoi(poi.poi!);
              poi.close();
            }}
          />
        </InfoWindow>
      )}
    </>
  );
}
