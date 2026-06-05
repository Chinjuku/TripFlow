import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { addPlace, removePlace } from '@/api/places';
import { bucketFor, BUCKETS } from '@/utils/places';
import type { PoiPreview } from '@/utils/places-map';
import { useTripPlaces } from '@/hooks/usePlaces';
import { useTrip } from '@/hooks/useTrips';
import { useAuth } from '@/hooks/useAuth';
import type { PlaceBucket, PlanTab, PlanTabMeta, SortKey, TripPlace } from '@/types/places';

function sortByVotesThenAge(list: TripPlace[]): TripPlace[] {
  return [...list].sort((a, b) => {
    if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

/**
 * All state, URL params, derived lists, and mutation handlers for the trip
 * plan page. Keeps the page itself a thin layout that just renders the result.
 */
export function useTripPlanPage(id: string | undefined) {
  const { user } = useAuth();
  const { data: trip } = useTrip(id);
  const { data: places, error, isLoading, mutate } = useTripPlaces(id);
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null);
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [addError, setAddError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('votes');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const tab: PlanTab = searchParams.get('tab') === 'vote' ? 'vote' : 'plan';

  const placeCount = places?.length ?? 0;
  const votedCount = (places ?? []).filter((p) => p.voteCount > 0).length;

  const tabs: PlanTabMeta[] = [
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

  const activeMeta = tabs.find((tabMeta) => tabMeta.id === tab)!;

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

  function registerCardRef(placeId: string, node: HTMLElement | null) {
    if (node) cardRefs.current.set(placeId, node);
    else cardRefs.current.delete(placeId);
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
    mutate((prev) =>
      sortByVotesThenAge((prev ?? []).map((p) => (p.id === updated.id ? updated : p))),
    );
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
    return [...list].sort((a, b) => {
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
  }, [places, sortKey]);

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

  function toggleBulkMode() {
    if (bulkMode) exitBulkMode();
    else setBulkMode(true);
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
        err instanceof Error ? err.message : t('plan.failedToRemove', 'Failed to remove some places'),
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
        nameEn: poi.nameEn,
        addressEn: poi.addressEn,
        category: poi.category,
        lat: poi.lat,
        lng: poi.lng,
        photoUrl: poi.photoUrl,
        rating: poi.rating,
        openingHoursText: poi.openingHoursText,
        openingPeriods: poi.openingPeriods,
        stayMinutes: 90,
      });
      mutate((prev) => {
        const list = prev ?? [];
        const without = list.filter((p) => p.id !== added.id);
        return sortByVotesThenAge([added, ...without]);
      });
    } catch (err) {
      setAddError(err instanceof Error ? err.message : t('plan.failedToAdd', 'Failed to add place'));
    }
  }

  return {
    // data
    trip,
    places,
    error,
    isLoading,
    currentUserId: user?.id,
    // tabs + category
    tab,
    tabs,
    activeMeta,
    activeCat,
    setTab,
    setCat,
    // derived lists
    processedPlaces,
    voteListPlaces,
    availableBuckets,
    pickedExternalIds,
    tripCenter,
    memberById,
    // map / hover
    hoveredPlaceId,
    setHoveredPlaceId,
    focusCard,
    registerCardRef,
    // sorting + bulk
    sortKey,
    setSortKey,
    bulkMode,
    bulkSelected,
    bulkBusy,
    toggleBulkMode,
    toggleBulkSelected,
    handleBulkDelete,
    // mutations
    addError,
    handlePlaceChange,
    handlePlaceRemove,
    handleAddPoi,
  };
}
