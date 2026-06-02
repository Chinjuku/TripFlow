import { useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { cn } from '@trip-flow/ui/lib/cn';
import { useAuth } from '@/hooks/useAuth';
import { useTrip } from '@/components/feat/trips';
import { TripPageHeader } from '@/components/shared/TripPageHeader';
import { useTranslation } from 'react-i18next';
import {
  addPlace,
  bucketFor,
  BUCKETS,
  removePlace,
  useTripPlaces,
  PlaceList,
  ListToolbar,
  CategoryTabs,
  TopRanking,
  PlanEmptyState,
  PlacesMap,
} from '@/components/feat/places';
import type { PlaceBucket } from '@/components/feat/places';
import type { FilterKey, SortKey, PlanTab, TripPlace } from '@/types/places';
import type { PoiPreview } from '@/components/feat/places';

interface TabMeta {
  id: PlanTab;
  label: string;
  heading: string;
  helper: string;
  /** Count shown as a pill next to the label (e.g. picked places / voted). */
  count: number;
}

// We'll generate TABS dynamically inside the component since they use translations.

function sortPlaces(list: TripPlace[]): TripPlace[] {
  return [...list].sort((a, b) => {
    if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

export default function TripPlanPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: trip } = useTrip(id);
  const { data: places, error, isLoading, mutate } = useTripPlaces(id);
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null);
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [addError, setAddError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sortKey, setSortKey] = useState<SortKey>('votes');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const tab: PlanTab = searchParams.get('tab') === 'vote' ? 'vote' : 'plan';

  const placeCount = places?.length ?? 0;
  const votedCount = (places ?? []).filter((p) => p.voteCount > 0).length;

  const TABS: TabMeta[] = [
    {
      id: 'plan',
      label: t('plan.suggestions', 'Suggestions'),
      heading: t('plan.planPlaces', 'Plan places'),
      helper: t('plan.planPlacesHelper', 'Pick candidate places to put up for the group.'),
      count: placeCount,
    },
    {
      id: 'vote',
      label: t('plan.voting', 'Voting'),
      heading: t('plan.votePlaces', 'Vote for Places'),
      helper: t(
        'plan.votePlacesHelper',
        'Help decide the itinerary by voting for your favorite spots.',
      ),
      count: votedCount,
    },
  ];

  const activeMeta = TABS.find((t) => t.id === tab)!;
  const catParam = searchParams.get('cat');
  const activeCat: PlaceBucket | 'all' =
    catParam && (Object.keys(BUCKETS) as PlaceBucket[]).includes(catParam as PlaceBucket)
      ? (catParam as PlaceBucket)
      : 'all';

  function setTab(next: PlanTab) {
    const params = new URLSearchParams(searchParams);
    if (next === 'plan') params.delete('tab');
    else params.set('tab', next);
    if (next !== 'vote') params.delete('cat');
    setSearchParams(params, { replace: true });
  }

  function setCat(next: PlaceBucket | 'all') {
    const params = new URLSearchParams(searchParams);
    if (next === 'all') params.delete('cat');
    else params.set('cat', next);
    setSearchParams(params, { replace: true });
  }

  function focusCard(placeId: string) {
    const node = cardRefs.current.get(placeId);
    if (!node) return;
    node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHoveredPlaceId(placeId);
    window.setTimeout(() => {
      setHoveredPlaceId((current) => (current === placeId ? null : current));
    }, 1500);
  }

  const pickedExternalIds = useMemo(
    () => new Set((places ?? []).map((p) => p.externalId)),
    [places],
  );

  const tripCenter = useMemo(
    () =>
      trip?.centerLat != null && trip?.centerLng != null
        ? { lat: trip.centerLat, lng: trip.centerLng }
        : null,
    [trip?.centerLat, trip?.centerLng],
  );

  const memberById = useMemo(() => {
    const map = new Map<string, { name: string; avatarUrl: string | null }>();
    for (const m of trip?.members ?? []) {
      map.set(m.userId, { name: m.name, avatarUrl: m.avatarUrl });
    }
    return map;
  }, [trip?.members]);

  function handlePlaceChange(updated: TripPlace) {
    mutate((prev) => sortPlaces((prev ?? []).map((p) => (p.id === updated.id ? updated : p))));
  }

  function handlePlaceRemove(placeId: string) {
    mutate((prev) => (prev ?? []).filter((p) => p.id !== placeId));
    setBulkSelected((curr) => {
      if (!curr.has(placeId)) return curr;
      const next = new Set(curr);
      next.delete(placeId);
      return next;
    });
  }

  const processedPlaces = useMemo(() => {
    const list = places ?? [];
    const filtered = list.filter((p) => {
      switch (filter) {
        case 'voted':
          return p.voteCount > 0;
        case 'mine':
          return p.addedByUserId === user?.id;
        case 'photos':
          return !!p.photoUrl;
        default:
          return true;
      }
    });
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'recent':
          return b.createdAt.localeCompare(a.createdAt);
        default:
          if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
          return a.createdAt.localeCompare(b.createdAt);
      }
    });
  }, [places, filter, sortKey, user?.id]);

  const availableBuckets = useMemo(() => {
    const set = new Set<PlaceBucket>();
    for (const p of places ?? []) set.add(bucketFor(p.category));
    return set;
  }, [places]);

  const voteListPlaces = useMemo(() => {
    const list = places ?? [];
    const inCat =
      activeCat === 'all' ? list : list.filter((p) => bucketFor(p.category) === activeCat);
    return [...inCat].sort((a, b) => {
      if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
      return a.createdAt.localeCompare(b.createdAt);
    });
  }, [places, activeCat]);

  function toggleBulkSelected(placeId: string) {
    setBulkSelected((curr) => {
      const next = new Set(curr);
      if (next.has(placeId)) next.delete(placeId);
      else next.add(placeId);
      return next;
    });
  }

  function exitBulkMode() {
    setBulkMode(false);
    setBulkSelected(new Set());
  }

  async function handleBulkDelete() {
    if (!id || bulkSelected.size === 0) return;
    setBulkBusy(true);
    setAddError(null);
    try {
      for (const placeId of bulkSelected) {
        await removePlace(id, placeId);
        handlePlaceRemove(placeId);
      }
      exitBulkMode();
    } catch (err) {
      setAddError(
        err instanceof Error
          ? err.message
          : t('plan.failedToRemove', 'Failed to remove some places'),
      );
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleAddPoi(poi: PoiPreview) {
    if (!id) return;
    setAddError(null);
    try {
      const added = await addPlace(id, {
        externalId: poi.placeId,
        name: poi.name,
        address: poi.address,
        category: poi.category,
        lat: poi.lat,
        lng: poi.lng,
        photoUrl: poi.photoUrl,
        rating: poi.rating,
        openingHoursText: poi.openingHoursText,
        stayMinutes: 90,
      });
      mutate((prev) => {
        const list = prev ?? [];
        const without = list.filter((p) => p.id !== added.id);
        return sortPlaces([added, ...without]);
      });
    } catch (err) {
      setAddError(
        err instanceof Error ? err.message : t('plan.failedToAdd', 'Failed to add place'),
      );
    }
  }

  if (!id) return null;

  return (
    <div className="mx-auto flex flex-col gap-6 pb-6 max-w-6xl lg:h-[calc(100dvh-4rem)] lg:overflow-hidden lg:pb-0">
      <div className="shrink-0 space-y-6">
        <TripPageHeader
          backTo={`/trips/${id}`}
          backLabel={t('overview.tripOverview', 'Trip overview')}
          title={activeMeta.heading}
          subtitle={activeMeta.helper}
        />

        {/* Tabs */}
        <div className="border-border flex items-center justify-between gap-3 border-b">
          <div className="flex gap-2" role="tablist" aria-label="Plan view">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'relative -mb-px inline-flex items-center gap-2 px-3 py-2.5 text-sm font-semibold transition-colors sm:px-4',
                  'border-b-2',
                  tab === t.id
                    ? 'border-primary text-foreground'
                    : 'text-muted-foreground hover:text-foreground border-transparent',
                )}
              >
                {t.label}
                {t.count > 0 && (
                  <span
                    className={cn(
                      'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums',
                      tab === t.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          {tab === 'plan' && (
            <span className="text-muted-foreground mb-2 hidden text-xs sm:inline">
              {t('plan.tipClickMap', 'Tip: click any place on the map to add it.')}
            </span>
          )}
        </div>

        {/* Errors */}
        {(error || addError) && (
          <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-4 text-sm">
            {error?.message ?? addError}
          </div>
        )}

        {/* Toolbar */}
        {tab === 'plan' && (places?.length ?? 0) > 0 && (
          <ListToolbar
            filter={filter}
            onFilterChange={setFilter}
            sortKey={sortKey}
            onSortChange={setSortKey}
            bulkMode={bulkMode}
            onToggleBulkMode={() => {
              if (bulkMode) exitBulkMode();
              else setBulkMode(true);
            }}
            bulkSelected={bulkSelected}
            onBulkDelete={handleBulkDelete}
            bulkBusy={bulkBusy}
            places={places ?? []}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 lg:min-h-0 lg:flex lg:flex-col">
        {tab === 'vote' ? (
          <div className="flex flex-col h-full lg:min-h-0">
            {(places?.length ?? 0) > 0 && (
              <div className="shrink-0 mb-6">
                <CategoryTabs
                  active={activeCat}
                  onChange={setCat}
                  available={availableBuckets}
                  places={places ?? []}
                />
              </div>
            )}
            <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:flex-1 lg:min-h-0">
              <div className="lg:overflow-y-auto px-1 py-1 lg:p-2">
                <PlaceList
                  loading={isLoading && places === null}
                  places={voteListPlaces}
                  tripId={id}
                  mode="vote"
                  memberById={memberById}
                  currentUserId={user?.id}
                  bulkMode={bulkMode}
                  bulkSelected={bulkSelected}
                  onToggleSelect={toggleBulkSelected}
                  onChange={handlePlaceChange}
                  onRemove={handlePlaceRemove}
                  emptyState={<PlanEmptyState tab="vote" onGoToPlan={() => setTab('plan')} />}
                />
              </div>
              <aside className="lg:overflow-y-auto px-1 py-1 lg:p-2 lg:self-start">
                <TopRanking places={places ?? []} activeCat={activeCat} />
              </aside>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6 h-full lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:flex-1 lg:min-h-0">
            <aside className="shrink-0 lg:h-full lg:min-h-0">
              <div className="h-[45vh] min-h-[300px] lg:h-full rounded-2xl overflow-hidden border border-border shadow-md ring-1 ring-border/50">
                {/* Wait for the trip (and its centre) before mounting the map,
                    so it opens straight on the destination instead of starting
                    at the Bangkok fallback and panning over. */}
                {trip ? (
                  <PlacesMap
                    places={places ?? []}
                    pickedExternalIds={pickedExternalIds}
                    hoveredId={hoveredPlaceId}
                    onPinClick={focusCard}
                    onPinHover={setHoveredPlaceId}
                    onAddPoi={handleAddPoi}
                    center={tripCenter}
                  />
                ) : (
                  <div className="bg-muted h-full w-full animate-pulse" />
                )}
              </div>
            </aside>
            <div className="lg:overflow-y-auto px-1 py-1 lg:p-2">
              <PlaceList
                loading={isLoading && places === null}
                places={processedPlaces}
                tripId={id}
                mode="plan"
                memberById={memberById}
                currentUserId={user?.id}
                hoveredId={hoveredPlaceId}
                onHover={setHoveredPlaceId}
                bulkMode={bulkMode}
                bulkSelected={bulkSelected}
                onToggleSelect={toggleBulkSelected}
                registerCardRef={(placeId, node) => {
                  if (node) cardRefs.current.set(placeId, node);
                  else cardRefs.current.delete(placeId);
                }}
                onChange={handlePlaceChange}
                onRemove={handlePlaceRemove}
                emptyState={<PlanEmptyState tab="plan" onGoToPlan={() => setTab('plan')} />}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
