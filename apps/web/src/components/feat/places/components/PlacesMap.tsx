import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AdvancedMarker,
  APIProvider,
  InfoWindow,
  Map,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  Check,
  Coffee,
  History,
  Landmark,
  Layers,
  MapPin,
  Plus,
  RotateCcw,
  Search,
  Star,
  ThumbsUp,
  Utensils,
  Wine,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@trip-flow/ui/components/button';
import { Input } from '@trip-flow/ui/components/input';
import { cn } from '@trip-flow/ui/lib/cn';
import { bucketFor, type TripPlace } from '@/components/feat/places';

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
  /** Lucide icon component rendered next to the label in the filter pill. */
  icon: LucideIcon;
  /** Google Places "included type" — see Places API (New) docs. */
  includedType: string;
}

const CATEGORY_FILTERS: CategoryFilter[] = [
  { id: 'cafe', label: 'Cafés', icon: Coffee, includedType: 'cafe' },
  { id: 'restaurant', label: 'Food', icon: Utensils, includedType: 'restaurant' },
  { id: 'attraction', label: 'Attractions', icon: Landmark, includedType: 'tourist_attraction' },
  { id: 'bar', label: 'Bars', icon: Wine, includedType: 'bar' },
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

  return <PlacesMapInner {...props} />;
}

/** Map type toggle options — labels double as `aria-label`. */
const MAP_TYPES = [
  { id: 'roadmap', label: 'Map' },
  { id: 'satellite', label: 'Satellite' },
  { id: 'terrain', label: 'Terrain' },
] as const;
type MapTypeId = (typeof MAP_TYPES)[number]['id'];

function PlacesMapInner(props: PlacesMapProps) {
  // Controlled map-type lets us swap roadmap / satellite / terrain without
  // dropping into the Google default UI. Default `roadmap` matches the
  // previous look so this is non-breaking.
  const [mapTypeId, setMapTypeId] = useState<MapTypeId>('roadmap');

  return (
    <div className="border-border bg-card relative h-full w-full overflow-hidden rounded-2xl border">
      <APIProvider apiKey={API_KEY!}>
        <Map
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={DEFAULT_ZOOM}
          mapId={MAP_ID}
          mapTypeId={mapTypeId}
          gestureHandling="greedy"
          clickableIcons
          disableDefaultUI
        >
          <MapBody {...props} />
          {/* Map-type toggle sits in the bottom-right corner, outside MapBody
              so it stays mounted while the inner map redraws. */}
          <MapTypeToggle value={mapTypeId} onChange={setMapTypeId} />
        </Map>
      </APIProvider>
    </div>
  );
}

/** localStorage key for the recent-search dropdown. */
const RECENT_SEARCHES_KEY = 'tripflow.placesmap.recent';
const RECENT_SEARCHES_LIMIT = 5;

function loadRecentSearches(): string[] {
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

function saveRecentSearches(list: string[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(list));
  } catch {
    /* quota / private-mode — fail open. */
  }
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
  const [recentSearches, setRecentSearches] = useState<string[]>(() => loadRecentSearches());
  const [searchFocused, setSearchFocused] = useState(false);
  /**
   * Toggled true once the user moves the map after a search. While true we
   * show the "Search this area" CTA so they can re-run the last query in
   * the current viewport instead of re-typing.
   */
  const [showSearchHereCta, setShowSearchHereCta] = useState(false);
  // Track the last text query OR active filter so "Search this area" knows
  // what to re-run. Stored together as a discriminated payload.
  const lastSearchRef = useRef<
    | { kind: 'text'; query: string }
    | { kind: 'filter'; filter: CategoryFilter }
    | null
  >(null);

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
    setShowSearchHereCta(false);
    lastSearchRef.current = { kind: 'text', query };
    pushRecentSearch(query);
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
    setShowSearchHereCta(false);
    lastSearchRef.current = { kind: 'filter', filter };
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

  /**
   * Persists the last text query at the front of the recent list, deduped
   * and capped to RECENT_SEARCHES_LIMIT. Filter searches aren't recorded —
   * they're one tap to repeat anyway.
   */
  function pushRecentSearch(query: string) {
    const trimmed = query.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const next = [trimmed, ...prev.filter((q) => q.toLowerCase() !== trimmed.toLowerCase())].slice(
        0,
        RECENT_SEARCHES_LIMIT,
      );
      saveRecentSearches(next);
      return next;
    });
  }

  /** Re-runs the last search in the current viewport. */
  function searchHere() {
    const last = lastSearchRef.current;
    if (!last) return;
    if (last.kind === 'text') void runTextSearch(last.query);
    else void runNearbySearch(last.filter);
  }

  /* ------------------------------------------------------------------ */
  /*  "Search this area" trigger                                        */
  /* ------------------------------------------------------------------ */
  // Show the CTA whenever the user pans/zooms after a search. Tied to the
  // map's `idle` event (fires once movement settles) with a small debounce
  // so we don't flash the button during quick gestures.
  useEffect(() => {
    if (!map) return;
    let timer: number | undefined;
    const listener = map.addListener('idle', () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        // Surface CTA only when a previous search exists to repeat.
        if (lastSearchRef.current) setShowSearchHereCta(true);
      }, 200);
    });
    return () => {
      if (timer) window.clearTimeout(timer);
      listener.remove();
    };
  }, [map]);

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
    setShowSearchHereCta(false);
    lastSearchRef.current = null;
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
        <div className="relative pointer-events-auto">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmit={() => {
              setActiveFilter(null);
              void runTextSearch(searchQuery);
            }}
            onClear={clearSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => {
              // Delay so clicking a recent item registers before blur clears it.
              window.setTimeout(() => setSearchFocused(false), 150);
            }}
            searching={searching}
            hasResults={searchHits.length > 0 || !!searchQuery}
          />
          {searchFocused && !searchQuery && recentSearches.length > 0 && (
            <RecentSearchesDropdown
              items={recentSearches}
              onPick={(q) => {
                setSearchQuery(q);
                setActiveFilter(null);
                void runTextSearch(q);
              }}
              onClear={() => {
                setRecentSearches([]);
                saveRecentSearches([]);
              }}
            />
          )}
        </div>
        <CategoryFilterRow active={activeFilter} onClick={handleFilterClick} />
      </div>

      {/* "Search this area" — surfaces after the user pans/zooms once a
          search has been run. One tap re-runs the last query (text or
          filter) against the new viewport. */}
      {showSearchHereCta && (
        <button
          type="button"
          onClick={searchHere}
          className="bg-card text-foreground border-border pointer-events-auto absolute left-1/2 top-28 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-md transition-colors hover:bg-muted"
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
          Search this area
        </button>
      )}

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

      {/* Picked-place markers.
          Gold / silver / bronze medals run *per category bucket* rather
          than across the whole trip — so each leaderboard (food, café,
          attractions, …) gets its own podium on the map. This matches the
          per-category leaderboards in the sidebar so the two views never
          disagree about which marker is "first". */}
      {(() => {
        // Group by bucket → sort → top 3 → flatten into a single lookup.
        const byBucket: Record<string, typeof withCoords> = {};
        for (const p of withCoords) {
          if (p.voteCount <= 0) continue;
          const b = bucketFor(p.category);
          (byBucket[b] ??= []).push(p);
        }
        // Plain object lookup instead of `new Map()` — the `Map` import
        // from @vis.gl/react-google-maps shadows the JS built-in inside
        // this file, so calling `new Map()` would resolve to the React
        // component constructor. A `Record` keeps things simple here.
        const podium: Record<string, 0 | 1 | 2> = {};
        for (const list of Object.values(byBucket)) {
          const sorted = [...list].sort((a, b) => {
            if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
            return a.createdAt.localeCompare(b.createdAt);
          });
          sorted.slice(0, 3).forEach((p, i) => {
            podium[p.id] = i as 0 | 1 | 2;
          });
        }

        return withCoords.map((p) => {
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
                  // Pill rather than circle so the upvote icon + count have
                  // breathing room without cramping the type.
                  'inline-flex items-center justify-center gap-0.5 rounded-full border-2 font-bold shadow-lg transition-all',
                  hovered ? 'h-9 px-2.5 text-sm' : 'h-7 px-2 text-xs',
                  // Podium tones (gold / silver / bronze) for top three;
                  // primary for everyone else. Each medal pin uses a dark
                  // text colour for legibility AND a white outer ring so
                  // the pill stays visible on both light and satellite
                  // map tiles. Borders are intentionally one shade darker
                  // than the fill to keep edges crisp.
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
        });
      })()}

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
  onFocus?: () => void;
  onBlur?: () => void;
  searching: boolean;
  hasResults: boolean;
}

function SearchBar({
  value,
  onChange,
  onSubmit,
  onClear,
  onFocus,
  onBlur,
  searching,
  hasResults,
}: SearchBarProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="bg-card border-border flex items-center gap-2 rounded-full border p-1.5 shadow-md"
    >
      <Search className="text-muted-foreground ml-2 h-4 w-4 shrink-0" strokeWidth={2} />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
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
/*  Recent searches dropdown                                                */
/* ------------------------------------------------------------------------ */

/**
 * Appears below the empty search bar on focus. Click an item to re-run it;
 * "Clear" wipes both state and localStorage. Pointer-events-auto so it
 * lives inside the search-overlay's pointer-events-none parent.
 */
function RecentSearchesDropdown({
  items,
  onPick,
  onClear,
}: {
  items: string[];
  onPick: (query: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="bg-card border-border absolute left-0 right-0 top-[calc(100%+0.25rem)] z-20 overflow-hidden rounded-2xl border shadow-lg">
      <div className="border-border text-muted-foreground flex items-center justify-between border-b px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-wider">
        <span className="inline-flex items-center gap-1.5">
          <History className="h-3 w-3" strokeWidth={2} />
          Recent
        </span>
        <button
          type="button"
          // onMouseDown beats the search input's onBlur — by the time blur
          // fires the click already registered against this button.
          onMouseDown={(e) => {
            e.preventDefault();
            onClear();
          }}
          className="hover:text-foreground text-[0.65rem] font-semibold"
        >
          Clear
        </button>
      </div>
      <ul>
        {items.map((q) => (
          <li key={q}>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(q);
              }}
              className="hover:bg-muted text-foreground flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
            >
              <History className="text-muted-foreground h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              <span className="truncate">{q}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/*  Map-type toggle                                                         */
/* ------------------------------------------------------------------------ */

/**
 * Segmented control in the bottom-right corner. Each option calls back with
 * its id; the parent persists the choice in state. Sits in absolute layer
 * above the map so it doesn't compete with the search overlay at the top.
 */
function MapTypeToggle({
  value,
  onChange,
}: {
  value: MapTypeId;
  onChange: (next: MapTypeId) => void;
}) {
  return (
    <div className="bg-card border-border absolute bottom-3 right-3 z-10 flex items-center gap-0.5 rounded-full border p-0.5 shadow-md">
      <Layers className="text-muted-foreground ml-2 mr-1 h-3.5 w-3.5" strokeWidth={2} />
      {MAP_TYPES.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          aria-pressed={value === t.id}
          className={cn(
            'rounded-full px-2.5 py-1 text-[0.7rem] font-semibold transition-colors',
            value === t.id
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
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
        const Icon = f.icon;
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
            <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
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
