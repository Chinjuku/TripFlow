import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AdvancedMarker,
  APIProvider,
  InfoWindow,
  Map,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { Check, MapPin, Plus, Search, Star, X } from 'lucide-react';
import { Button } from '@trip-flow/ui/components/button';
import { Input } from '@trip-flow/ui/components/input';
import { cn } from '@trip-flow/ui/lib/cn';
import type { TripPlace } from '@/features/places';

interface PlacesMapProps {
  /** Picked places — rendered as our own branded markers. */
  places: TripPlace[];
  /** Set of Google place_ids already added — used to disable Add on the preview. */
  pickedExternalIds: Set<string>;
  /** Id of the picked place the user is hovering in the list (scales its marker up). */
  hoveredId: string | null;
  /** Fires when the user clicks a picked-place marker. */
  onPinClick: (placeId: string) => void;
  /** Fires when the user hovers a picked-place marker. */
  onPinHover: (placeId: string | null) => void;
  /** Fires when the user clicks "Add" inside a POI preview. Caller persists it. */
  onAddPoi: (poi: PoiPreview) => Promise<void> | void;
}

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

interface SearchHit {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  rating: number | null;
  category: string | null;
}

interface CategoryFilter {
  id: string;
  label: string;
  emoji: string;
  /** Google Places "included type" — see Places API (New) docs. */
  includedType: string;
}

const CATEGORY_FILTERS: CategoryFilter[] = [
  { id: 'cafe', label: 'Cafés', emoji: '☕', includedType: 'cafe' },
  { id: 'restaurant', label: 'Food', emoji: '🍴', includedType: 'restaurant' },
  { id: 'attraction', label: 'Attractions', emoji: '🏛', includedType: 'tourist_attraction' },
  { id: 'bar', label: 'Bars', emoji: '🍸', includedType: 'bar' },
];

const DEFAULT_CENTER = { lat: 13.7563, lng: 100.5018 }; // Bangkok
const DEFAULT_ZOOM = 12;
const MAP_ID = 'tripflow-plan-map';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

export function PlacesMap(props: PlacesMapProps) {
  if (!API_KEY) {
    return (
      <div className="border-border bg-card text-muted-foreground flex h-full w-full items-center justify-center rounded-2xl border p-6 text-center text-sm">
        <p className="max-w-[18rem]">
          Map disabled — set <code className="font-mono text-xs">VITE_GOOGLE_MAPS_API_KEY</code> in
          your <code className="font-mono text-xs">.env</code> to enable place discovery.
        </p>
      </div>
    );
  }

  return (
    <div className="border-border bg-card relative h-full w-full overflow-hidden rounded-2xl border">
      <APIProvider apiKey={API_KEY}>
        <Map
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={DEFAULT_ZOOM}
          mapId={MAP_ID}
          gestureHandling="greedy"
          clickableIcons
          disableDefaultUI
        >
          <MapBody {...props} />
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
}: PlacesMapProps) {
  const map = useMap();
  const placesLib = useMapsLibrary('places');

  const [poi, setPoi] = useState<PoiPreview | null>(null);
  const [poiLoading, setPoiLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const withCoords = useMemo(
    () =>
      places.filter(
        (p): p is TripPlace & { lat: number; lng: number } => p.lat !== null && p.lng !== null,
      ),
    [places],
  );

  /* ------------------------------------------------------------------ */
  /*  Auto-fit on picked-places set change                              */
  /* ------------------------------------------------------------------ */
  const fitSignature = useMemo(
    () =>
      withCoords
        .map((p) => `${p.id}:${p.lat.toFixed(4)},${p.lng.toFixed(4)}`)
        .sort()
        .join('|'),
    [withCoords],
  );

  useEffect(() => {
    if (!map || withCoords.length === 0) return;
    if (withCoords.length === 1) {
      map.panTo({ lat: withCoords[0]!.lat, lng: withCoords[0]!.lng });
      map.setZoom(14);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    withCoords.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
    map.fitBounds(bounds, 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, fitSignature]);

  /* ------------------------------------------------------------------ */
  /*  Native POI click → load details                                   */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener('click', (e: google.maps.IconMouseEvent) => {
      const placeId = (e as { placeId?: string }).placeId;
      if (!placeId) {
        setPoi(null);
        return;
      }
      e.stop?.();
      void loadPoi(placeId);
    });
    return () => listener.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  /* ------------------------------------------------------------------ */
  /*  Place details fetch (Place class, new SDK)                        */
  /* ------------------------------------------------------------------ */
  const loadPoi = useCallback(
    async (placeId: string) => {
      if (!placesLib || !map) return;
      setPoiLoading(true);
      setPoi(null);
      try {
        const place = new placesLib.Place({ id: placeId });
        await place.fetchFields({
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'rating',
            'regularOpeningHours',
            'photos',
            'types',
          ],
        });

        if (!place.location) {
          setPoi(null);
          return;
        }
        const preview: PoiPreview = {
          placeId: place.id ?? placeId,
          name: place.displayName ?? 'Unknown place',
          address: place.formattedAddress ?? null,
          category: place.types?.[0] ?? null,
          lat: place.location.lat(),
          lng: place.location.lng(),
          photoUrl: place.photos?.[0]?.getURI({ maxWidth: 480 }) ?? null,
          rating: place.rating ?? null,
          openingHoursText: openingHoursSummary(place.regularOpeningHours ?? null),
        };
        setPoi(preview);
        // Recenter so the popup is fully visible.
        map.panTo({ lat: preview.lat, lng: preview.lng });
      } catch (err) {
        console.error('[places-map] failed to load POI', err);
        setPoi(null);
      } finally {
        setPoiLoading(false);
      }
    },
    [placesLib, map],
  );

  /* ------------------------------------------------------------------ */
  /*  Text Search (manual query) + category filter (predefined type)    */
  /* ------------------------------------------------------------------ */
  async function runTextSearch(query: string) {
    if (!placesLib || !map || !query.trim()) return;
    setSearching(true);
    try {
      const { places: results } = await placesLib.Place.searchByText({
        textQuery: query,
        // Bias toward the current viewport so "cafe" near Siam finds Siam cafés.
        locationBias: map.getBounds() ?? undefined,
        fields: ['id', 'displayName', 'location', 'rating', 'types'],
        maxResultCount: 20,
      });
      applyHits(results);
    } catch (err) {
      console.error('[places-map] search failed', err);
    } finally {
      setSearching(false);
    }
  }

  async function runNearbySearch(filter: CategoryFilter) {
    if (!placesLib || !map) return;
    const bounds = map.getBounds();
    if (!bounds) return;
    setSearching(true);
    try {
      // Nearby search needs a circular region — derive one from the viewport.
      const center = bounds.getCenter();
      const ne = bounds.getNorthEast();
      // Half the diagonal, capped — keeps the query cost predictable.
      const radius = Math.min(
        google.maps.geometry?.spherical?.computeDistanceBetween?.(center, ne) ?? 4000,
        5000,
      );

      const { places: results } = await placesLib.Place.searchNearby({
        locationRestriction: {
          center: { lat: center.lat(), lng: center.lng() },
          radius,
        },
        includedPrimaryTypes: [filter.includedType],
        fields: ['id', 'displayName', 'location', 'rating', 'types'],
        maxResultCount: 20,
      });
      applyHits(results);
    } catch (err) {
      console.error('[places-map] nearby search failed', err);
    } finally {
      setSearching(false);
    }
  }

  function applyHits(results: google.maps.places.Place[]) {
    if (!map) return;
    const hits: SearchHit[] = [];
    const bounds = new google.maps.LatLngBounds();
    for (const r of results) {
      if (!r.id || !r.location || !r.displayName) continue;
      hits.push({
        placeId: r.id,
        name: r.displayName,
        lat: r.location.lat(),
        lng: r.location.lng(),
        rating: r.rating ?? null,
        category: r.types?.[0] ?? null,
      });
      bounds.extend(r.location);
    }
    setSearchHits(hits);
    if (hits.length > 0) {
      map.fitBounds(bounds, 60);
    }
  }

  function clearSearch() {
    setSearchHits([]);
    setSearchQuery('');
    setActiveFilter(null);
  }

  function handleFilterClick(filter: CategoryFilter) {
    if (activeFilter === filter.id) {
      clearSearch();
      return;
    }
    setActiveFilter(filter.id);
    setSearchQuery('');
    void runNearbySearch(filter);
  }

  /* ------------------------------------------------------------------ */
  /*  Render                                                            */
  /* ------------------------------------------------------------------ */

  return (
    <>
      {/* Search + filter overlay (top of the map). */}
      <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-col gap-2">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onSubmit={() => {
            setActiveFilter(null);
            void runTextSearch(searchQuery);
          }}
          onClear={clearSearch}
          searching={searching}
          hasResults={searchHits.length > 0 || !!searchQuery}
        />
        <CategoryFilterRow active={activeFilter} onClick={handleFilterClick} />
      </div>

      {/* Search result pins (rendered first so picked-place markers sit above). */}
      {searchHits.map((hit) => (
        <AdvancedMarker
          key={`hit-${hit.placeId}`}
          position={{ lat: hit.lat, lng: hit.lng }}
          onClick={() => void loadPoi(hit.placeId)}
        >
          <div
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full border-2 shadow-md transition-transform hover:scale-110',
              'border-primary bg-card text-primary',
            )}
            aria-label={hit.name}
          >
            <MapPin className="h-3.5 w-3.5" strokeWidth={2.5} />
          </div>
        </AdvancedMarker>
      ))}

      {/* Picked-place markers. */}
      {withCoords.map((p) => {
        const hovered = hoveredId === p.id;
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
                'flex items-center justify-center rounded-full border-2 font-bold shadow-lg transition-all',
                hovered ? 'h-10 w-10 text-sm' : 'h-8 w-8 text-xs',
                p.voteCount >= 3
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-foreground border-border',
                hovered && 'border-primary scale-110',
              )}
            >
              {p.voteCount}
            </div>
          </AdvancedMarker>
        );
      })}

      {/* POI preview popup. */}
      {poi && (
        <InfoWindow
          position={{ lat: poi.lat, lng: poi.lng }}
          onCloseClick={() => setPoi(null)}
          pixelOffset={[0, -24]}
        >
          <PoiPreviewCard
            poi={poi}
            loading={poiLoading}
            alreadyPicked={pickedExternalIds.has(poi.placeId)}
            onAdd={async () => {
              await onAddPoi(poi);
              setPoi(null);
            }}
          />
        </InfoWindow>
      )}
    </>
  );
}

/* ------------------------------------------------------------------------ */
/*  Search bar                                                              */
/* ------------------------------------------------------------------------ */

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  searching: boolean;
  hasResults: boolean;
}

function SearchBar({ value, onChange, onSubmit, onClear, searching, hasResults }: SearchBarProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="bg-card border-border pointer-events-auto flex items-center gap-2 rounded-full border p-1.5 shadow-md"
    >
      <Search className="text-muted-foreground ml-2 h-4 w-4 shrink-0" strokeWidth={2} />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search places — e.g. cafés in Siam"
        className="h-8 flex-1 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
      />
      {hasResults && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-7 w-7 items-center justify-center rounded-full"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      )}
      <Button type="submit" size="sm" className="h-8 px-3" disabled={searching || !value.trim()}>
        {searching ? '…' : 'Search'}
      </Button>
    </form>
  );
}

/* ------------------------------------------------------------------------ */
/*  Category pills                                                          */
/* ------------------------------------------------------------------------ */

function CategoryFilterRow({
  active,
  onClick,
}: {
  active: string | null;
  onClick: (filter: CategoryFilter) => void;
}) {
  return (
    <div className="pointer-events-auto flex flex-wrap gap-2">
      {CATEGORY_FILTERS.map((f) => {
        const isActive = active === f.id;
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onClick(f)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-foreground border-border hover:bg-muted',
            )}
          >
            <span aria-hidden>{f.emoji}</span>
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/*  Preview card                                                            */
/* ------------------------------------------------------------------------ */

interface PoiPreviewCardProps {
  poi: PoiPreview;
  loading: boolean;
  alreadyPicked: boolean;
  onAdd: () => void | Promise<void>;
}

function PoiPreviewCard({ poi, loading, alreadyPicked, onAdd }: PoiPreviewCardProps) {
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    setAdding(true);
    try {
      await onAdd();
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="w-[18rem] max-w-[80vw]">
      {poi.photoUrl && (
        <img
          src={poi.photoUrl}
          alt=""
          className="-mx-3 -mt-3 mb-3 h-28 w-[calc(100%+1.5rem)] object-cover"
          loading="lazy"
        />
      )}
      <div className="space-y-2">
        <div>
          <h4 className="text-foreground text-sm font-bold leading-tight">{poi.name}</h4>
          {poi.address && (
            <p className="text-muted-foreground mt-0.5 line-clamp-2 flex items-start gap-1 text-xs">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={1.75} />
              <span>{poi.address}</span>
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {poi.rating !== null && (
            <span className="bg-muted text-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" strokeWidth={2} />
              {poi.rating.toFixed(1)}
            </span>
          )}
          {poi.openingHoursText && (
            <span className="text-muted-foreground text-xs">{poi.openingHoursText}</span>
          )}
        </div>

        <Button
          type="button"
          onClick={handleAdd}
          disabled={adding || loading || alreadyPicked}
          size="sm"
          className="w-full gap-2"
        >
          {alreadyPicked ? (
            <>
              <Check className="h-4 w-4" strokeWidth={2.5} />
              Already added
            </>
          ) : adding ? (
            'Adding…'
          ) : (
            <>
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Add to suggestions
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/*  Helpers                                                                 */
/* ------------------------------------------------------------------------ */

function openingHoursSummary(hours: google.maps.places.OpeningHours | null): string | null {
  if (!hours) return null;
  const today = new Date().getDay();
  const idx = (today + 6) % 7;
  const desc = hours.weekdayDescriptions?.[idx];
  if (!desc) return null;
  const colon = desc.indexOf(':');
  return colon >= 0 ? desc.slice(colon + 1).trim() : desc;
}

// Suppress unused warning — ref kept for future "save last viewport".
void useRef;
