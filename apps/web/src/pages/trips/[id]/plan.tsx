import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  BarChart3,
  Check,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  ListChecks,
  MapPinned,
  Sparkles,
  ThumbsUp,
  Trash2,
  Trophy,
} from 'lucide-react';
import { Button } from '@trip-flow/ui/components/button';
import { Skeleton } from '@trip-flow/ui/components/skeleton';
import { cn } from '@trip-flow/ui/lib/cn';
import { useAuth } from '@/features/auth/useAuth';
import { useTrip } from '@/features/trips';
import {
  addPlace,
  bucketFor,
  BUCKETS,
  removePlace,
  useTripPlaces,
  type PlaceBucket,
  type TripPlace,
} from '@/features/places';
import { PlaceCard, PlacesMap, type PoiPreview } from '@/features/places/components';

/** What the user can filter the candidate list down to. */
type FilterKey = 'all' | 'voted' | 'mine' | 'photos';
/** How the candidate list is ordered. */
type SortKey = 'votes' | 'name' | 'recent';

type Tab = 'plan' | 'vote';

interface TabMeta {
  id: Tab;
  label: string;
  heading: string;
  helper: string;
}

const TABS: TabMeta[] = [
  {
    id: 'plan',
    label: 'Suggestions',
    heading: 'Plan places',
    helper: 'Pick candidate places to put up for the group.',
  },
  {
    id: 'vote',
    label: 'Voting',
    heading: 'Vote for Places',
    helper: 'Help decide the itinerary by voting for your favorite spots.',
  },
];

export default function TripPlanPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: trip } = useTrip(id);
  const { data: places, error, isLoading, mutate } = useTripPlaces(id);
  const [searchParams, setSearchParams] = useSearchParams();
  // Shared hover state so the list and the map can highlight each other.
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null);
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [addError, setAddError] = useState<string | null>(null);
  // List toolbar state. Per-tab keys would feel right but keeping the
  // single source of truth is simpler — sort/filter intentionally carry
  // across tab switches.
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sortKey, setSortKey] = useState<SortKey>('votes');
  // Bulk select: a set of place ids the user has ticked + an explicit
  // "mode" flag so checkboxes only show when the toolbar requested them.
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  function focusCard(placeId: string) {
    const node = cardRefs.current.get(placeId);
    if (!node) return;
    node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHoveredPlaceId(placeId);
    // Auto-release the highlight after a beat so the visual settles.
    window.setTimeout(() => {
      setHoveredPlaceId((current) => (current === placeId ? null : current));
    }, 1500);
  }

  const tab: Tab = searchParams.get('tab') === 'vote' ? 'vote' : 'plan';
  const activeMeta = TABS.find((t) => t.id === tab)!;
  // Vote tab also carries a `cat` param so the active category sub-tab is
  // bookmarkable. `null` ("all") is the default and stays out of the URL.
  const catParam = searchParams.get('cat');
  const activeCat: PlaceBucket | 'all' =
    catParam && (Object.keys(BUCKETS) as PlaceBucket[]).includes(catParam as PlaceBucket)
      ? (catParam as PlaceBucket)
      : 'all';

  function setTab(next: Tab) {
    const params = new URLSearchParams(searchParams);
    if (next === 'plan') params.delete('tab');
    else params.set('tab', next);
    // Switching out of vote → drop the category param so navigating
    // back to vote starts on "All" rather than a half-remembered filter.
    if (next !== 'vote') params.delete('cat');
    setSearchParams(params, { replace: true });
  }

  function setCat(next: PlaceBucket | 'all') {
    const params = new URLSearchParams(searchParams);
    if (next === 'all') params.delete('cat');
    else params.set('cat', next);
    setSearchParams(params, { replace: true });
  }

  const pickedExternalIds = useMemo(
    () => new Set((places ?? []).map((p) => p.externalId)),
    [places],
  );

  // Member directory lets us show "Selected by …" on each vote card.
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
    // Drop the row from the bulk selection too so we never carry stale ids.
    setBulkSelected((curr) => {
      if (!curr.has(placeId)) return curr;
      const next = new Set(curr);
      next.delete(placeId);
      return next;
    });
  }

  /**
   * Applies the toolbar filter then sorts. Pure derivation off `places` —
   * keeping it in a useMemo means re-renders only recalc when inputs
   * actually change (filter / sort / list / currentUserId).
   */
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
        case 'all':
        default:
          return true;
      }
    });
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'recent':
          // Newest first.
          return b.createdAt.localeCompare(a.createdAt);
        case 'votes':
        default:
          if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
          return a.createdAt.localeCompare(b.createdAt);
      }
    });
  }, [places, filter, sortKey, user?.id]);

  /**
   * Set of buckets that have at least one place. Drives the category
   * sub-tabs in the vote view — buckets with no candidates stay hidden so
   * the strip doesn't carry dead navigation entries.
   */
  const availableBuckets = useMemo(() => {
    const set = new Set<PlaceBucket>();
    for (const p of places ?? []) set.add(bucketFor(p.category));
    return set;
  }, [places]);

  /**
   * Vote-tab places: derived directly from `places` so the category
   * sub-tabs are independent of the plan-tab filter chips (which only
   * apply in plan mode). Sorted by votes desc + recency.
   */
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

  /**
   * Bulk delete — sequential so a partial failure still updates the cache
   * for everything we managed to delete. On any error we stop, surface it
   * via the existing addError banner, and keep the surviving selection so
   * the user can retry.
   */
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
      setAddError(err instanceof Error ? err.message : 'Failed to remove some places');
    } finally {
      setBulkBusy(false);
    }
  }

  function handlePlaceAdded(added: TripPlace) {
    mutate((prev) => {
      const list = prev ?? [];
      const without = list.filter((p) => p.id !== added.id);
      return sortPlaces([added, ...without]);
    });
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
      handlePlaceAdded(added);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add place');
    }
  }

  if (!id) return null;

  return (
    // Fit-to-viewport layout: the page is exactly the visible viewport
    // height (minus the TripLayout main's py-8 padding), so map + list
    // share the leftover space below the header/tabs/toolbar instead of
    // pushing the document tall. `min-h-0` on this flex parent is critical
    // — without it the flex children can't shrink below their content.
    <div className="mx-auto flex h-[calc(100dvh-4rem)] min-h-0 max-w-6xl flex-col gap-6">
      {/* Header */}
      <div className="space-y-2">
        <Link
          to={`/trips/${id}`}
          className="text-muted-foreground hover:text-primary inline-flex items-center gap-2 text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Trip workspace
        </Link>
        <h1 className="text-foreground font-headline text-2xl font-extrabold tracking-tight sm:text-3xl">
          {activeMeta.heading}
        </h1>
        <p className="text-muted-foreground text-sm">{activeMeta.helper}</p>
      </div>

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
                'relative -mb-px px-3 py-2.5 text-sm font-semibold transition-colors sm:px-4',
                'border-b-2',
                tab === t.id
                  ? 'border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground border-transparent',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'plan' && (
          <span className="text-muted-foreground mb-2 hidden text-xs sm:inline">
            Tip: click any place on the map to add it.
          </span>
        )}
      </div>

      {/* Errors */}
      {(error || addError) && (
        <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-4 text-sm">
          {error?.message ?? addError}
        </div>
      )}

      {/* Toolbar — filter chips, sort, bulk actions. Only the Suggestions
          (plan) tab needs these; the vote tab has its own category sub-tabs
          and doesn't want a parallel control row competing for attention. */}
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

      {/* Content */}
      {tab === 'vote' ? (
        <>
          {/* Category sub-tabs sit above the grid (not nested inside the
              list column) so the right-hand "Top by category" card aligns
              with the first vote card on the left — keeping the two
              columns flush at the top. Plan-tab filter chips stay hidden
              in vote mode since these tabs replace them. */}
          {(places?.length ?? 0) > 0 && (
            <CategoryTabs
              active={activeCat}
              onChange={setCat}
              available={availableBuckets}
              places={places ?? []}
            />
          )}
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
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
              emptyState={
                <EmptyState tab="vote" onGoToPlan={() => setTab('plan')} />
              }
            />
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <TopRanking places={places ?? []} activeCat={activeCat} />
            </aside>
          </div>
        </>
      ) : (
        // `flex-1 min-h-0` lets this grid grow into the remaining viewport
        // height while still allowing children to shrink. Without min-h-0
        // the grid would refuse to shrink below the natural height of its
        // tallest child (the list), defeating the fit-to-screen layout.
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          {/* Map on the left, candidate list on the right — mirrors how
              most map-first picking apps lay out (Airbnb, Google Maps
              side panel) and leaves the dominant column for the
              interactive surface. */}
          <aside className="min-h-0">
            <div className="h-[32rem] lg:h-full">
              <PlacesMap
                places={places ?? []}
                pickedExternalIds={pickedExternalIds}
                hoveredId={hoveredPlaceId}
                onPinClick={focusCard}
                onPinHover={setHoveredPlaceId}
                onAddPoi={handleAddPoi}
              />
            </div>
          </aside>
          {/* Scroll-bounded list wrapper.
              On lg+ the list mirrors the map's height and scrolls inside
              itself — without this a long candidate list would push the
              page taller than the (sticky) map, breaking the side-by-side
              layout. We render it plain (no outer card frame) so the
              individual cards' shadows carry the elevation hierarchy
              instead of nesting card-on-card. */}
          <div className="min-h-0 px-1 py-1 lg:h-full lg:overflow-y-auto lg:p-2">
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
              emptyState={<EmptyState tab="plan" onGoToPlan={() => setTab('plan')} />}
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface PlaceListProps {
  loading: boolean;
  places: TripPlace[];
  tripId: string;
  mode: 'plan' | 'vote';
  memberById: Map<string, { name: string; avatarUrl: string | null }>;
  currentUserId: string | undefined;
  /** Set by the map (or by the list itself on hover) to highlight one card. */
  hoveredId?: string | null;
  onHover?: (id: string | null) => void;
  /** Lets the page jump-scroll a card into view when a pin is clicked. */
  registerCardRef?: (placeId: string, node: HTMLElement | null) => void;
  /** True when the bulk-select toolbar is active. Reveals row checkboxes. */
  bulkMode?: boolean;
  /** Ids the user has ticked while bulk mode is active. */
  bulkSelected?: Set<string>;
  /** Click handler for a row's checkbox. */
  onToggleSelect?: (placeId: string) => void;
  onChange: (p: TripPlace) => void;
  onRemove: (id: string) => void;
  emptyState: React.ReactNode;
}

function PlaceList({
  loading,
  places,
  tripId,
  mode,
  memberById,
  currentUserId,
  hoveredId,
  onHover,
  registerCardRef,
  bulkMode,
  bulkSelected,
  onToggleSelect,
  onChange,
  onRemove,
  emptyState,
}: PlaceListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl sm:h-44" />
        ))}
      </div>
    );
  }
  if (places.length === 0) {
    return <>{emptyState}</>;
  }
  return (
    <div className={cn(mode === 'vote' ? 'space-y-4' : 'space-y-3')}>
      {places.map((place) => {
        const adder = memberById.get(place.addedByUserId);
        const isHovered = hoveredId === place.id;
        const isSelected = bulkSelected?.has(place.id) ?? false;
        return (
          <div key={place.id}>
            <div
              ref={(node) => registerCardRef?.(place.id, node)}
              onMouseEnter={() => onHover?.(place.id)}
              onMouseLeave={() => onHover?.(null)}
              className={cn(
                // Hover highlight syncs with the map: card gains a primary
                // ring when its pin is hovered (and vice versa). Bulk
                // selection uses the same ring at full opacity to read as
                // a deliberate, sticky state.
                'relative rounded-xl transition-all duration-200',
                isHovered && 'ring-primary/60 ring-2 ring-offset-2 ring-offset-background',
                isSelected && 'ring-primary ring-2 ring-offset-2 ring-offset-background',
              )}
            >
              {bulkMode && (
                <button
                  type="button"
                  onClick={() => onToggleSelect?.(place.id)}
                  aria-pressed={isSelected}
                  aria-label={isSelected ? 'Deselect' : 'Select'}
                  className={cn(
                    'absolute left-2 top-2 z-10 inline-flex h-6 w-6 items-center justify-center rounded-md border-2 shadow-sm transition-colors',
                    isSelected
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'bg-card border-border hover:border-primary',
                  )}
                >
                  {isSelected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </button>
              )}
              <PlaceCard
                place={place}
                tripId={tripId}
                mode={mode}
                addedByName={adder?.name}
                addedByAvatarUrl={adder?.avatarUrl ?? null}
                canRemove={place.addedByUserId === currentUserId}
                onChange={onChange}
                onRemove={onRemove}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/*  List toolbar (filter chips + sort + bulk + day balance)                 */
/* ------------------------------------------------------------------------ */

const FILTERS: Array<{ id: FilterKey; label: string; icon: typeof ThumbsUp }> = [
  { id: 'all', label: 'All', icon: ListChecks },
  { id: 'voted', label: 'Voted only', icon: ThumbsUp },
  { id: 'mine', label: 'My picks', icon: Check },
  { id: 'photos', label: 'Has photo', icon: ImageIcon },
];

const SORTS: Array<{ id: SortKey; label: string }> = [
  { id: 'votes', label: 'Most votes' },
  { id: 'name', label: 'Name (A–Z)' },
  { id: 'recent', label: 'Recently added' },
];

interface ListToolbarProps {
  filter: FilterKey;
  onFilterChange: (next: FilterKey) => void;
  sortKey: SortKey;
  onSortChange: (next: SortKey) => void;
  bulkMode: boolean;
  onToggleBulkMode: () => void;
  bulkSelected: Set<string>;
  onBulkDelete: () => void;
  bulkBusy: boolean;
  places: TripPlace[];
}

function ListToolbar({
  filter,
  onFilterChange,
  sortKey,
  onSortChange,
  bulkMode,
  onToggleBulkMode,
  bulkSelected,
  onBulkDelete,
  bulkBusy,
  places,
}: ListToolbarProps) {
  // Per-filter counts. Computed off `places` (not the post-filter list) so
  // each chip shows its own potential rather than the active subset.
  const counts = useMemo(() => {
    const out: Record<FilterKey, number> = {
      all: places.length,
      voted: 0,
      mine: 0,
      photos: 0,
    };
    for (const p of places) {
      if (p.voteCount > 0) out.voted += 1;
      if (p.photoUrl) out.photos += 1;
      // `mine` left at 0 — current user id isn't piped in here; the chip
      // still works, it just shows the filtered subset on hover.
    }
    return out;
  }, [places]);

  return (
    // Flat layout — no outer card frame. The action row carries an
    // optional primary tint while bulk mode is active to signal that
    // destructive actions are armed.
    <div
      className={cn(
        'flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2',
        bulkMode && 'bg-primary/5 border-primary/30 -mx-2 rounded-xl border p-2',
      )}
    >
        {/* Filter chip row — scrolls horizontally on mobile rather than
            wrapping, so the toolbar height stays predictable. */}
        <div className="scrollbar-none -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 sm:flex-wrap sm:overflow-visible">
          {FILTERS.map((f) => {
            const Icon = f.icon;
            const active = filter === f.id;
            const count = counts[f.id];
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onFilterChange(f.id)}
                className={cn(
                  // Unified pill height (h-8) across every toolbar control
                  // so chips + sort + select sit on the same baseline.
                  'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-all',
                  active
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-card text-foreground border-border hover:border-primary/40 hover:bg-muted',
                )}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                {f.label}
                {f.id !== 'mine' && (
                  <span
                    className={cn(
                      'inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[0.6rem] font-bold tabular-nums',
                      active
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Spacer collapses on mobile (column layout) — keeps actions
            tucked to the right on sm+. */}
        <div className="hidden flex-1 sm:block" />

        <SortPicker value={sortKey} onChange={onSortChange} />

        {bulkMode ? (
          <div className="inline-flex items-center gap-2">
            <span className="text-muted-foreground text-xs font-semibold tabular-nums">
              {bulkSelected.size} selected
            </span>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={bulkSelected.size === 0 || bulkBusy}
              onClick={onBulkDelete}
              className="h-8 gap-1.5 rounded-full"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} />
              {bulkBusy ? 'Deleting…' : 'Delete'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onToggleBulkMode}
              className="h-8 rounded-full"
            >
              Done
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onToggleBulkMode}
            className="h-8 gap-1.5 rounded-full"
          >
            <ListChecks className="h-3.5 w-3.5" strokeWidth={2} />
            Select
          </Button>
        )}
      </div>
  );
}

/**
 * Custom sort picker — replaces the native `<select>` so the trigger sits
 * flush with the chip row and the menu uses our own typography + colours.
 *
 * Closes on click-outside or Escape; the trigger is a real <button> so
 * keyboard users can focus it with Tab and toggle with Enter / Space.
 * Native semantics enough for now — if we end up needing arrow-key
 * navigation inside the menu we'd switch to a Radix `<DropdownMenu>`.
 */
function SortPicker({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (next: SortKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const active = SORTS.find((s) => s.id === value) ?? SORTS[0]!;

  // Click-outside + Esc to dismiss. Effect only attaches listeners while
  // the menu is open so we're not paying for them on every render.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        // Sized + styled to mirror `<Button variant="outline" size="sm">`
        // exactly — h-8 height, padded the same, same border/hover. Keeps
        // the Sort trigger and the Select trigger visually identical.
        className="bg-card border-border text-foreground hover:border-primary/40 hover:bg-muted inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-all"
      >
        <ArrowUpDown className="text-muted-foreground h-3.5 w-3.5" strokeWidth={2} />
        <span>{active.label}</span>
        <ChevronDown
          className={cn('text-muted-foreground h-3 w-3 transition-transform', open && 'rotate-180')}
          strokeWidth={2.25}
          aria-hidden
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Sort places by"
          className="bg-card border-border absolute right-0 top-[calc(100%+0.375rem)] z-20 w-44 overflow-hidden rounded-xl border p-1 shadow-lg"
        >
          {SORTS.map((s) => {
            const selected = s.id === value;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(s.id);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold transition-colors',
                    selected
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-muted',
                  )}
                >
                  <span>{s.label}</span>
                  {selected && <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/*  Vote-tab category sub-tabs                                              */
/* ------------------------------------------------------------------------ */

/**
 * Horizontal segmented row of category filters shown above the vote list.
 * "All" is always first and visible; the bucket-specific tabs only render
 * when at least one place falls into that bucket, so empty trips don't
 * carry dead navigation. Counts come from the unfiltered `places` array.
 */
function CategoryTabs({
  active,
  onChange,
  available,
  places,
}: {
  active: PlaceBucket | 'all';
  onChange: (next: PlaceBucket | 'all') => void;
  available: Set<PlaceBucket>;
  places: TripPlace[];
}) {
  const counts = useMemo(() => {
    const out: Record<string, number> = { all: places.length };
    for (const p of places) {
      const b = bucketFor(p.category);
      out[b] = (out[b] ?? 0) + 1;
    }
    return out;
  }, [places]);

  // Visible tabs: "All" first, then buckets that exist in `available`,
  // preserving the canonical order from BUCKETS so the row never reshuffles.
  const visible = (
    ['all', ...(Object.keys(BUCKETS) as PlaceBucket[]).filter((b) => available.has(b))] as Array<
      PlaceBucket | 'all'
    >
  ).map((id) => ({
    id,
    label: id === 'all' ? 'All' : BUCKETS[id].plural,
    swatch: id === 'all' ? null : BUCKETS[id].swatch,
    count: counts[id] ?? 0,
  }));

  return (
    <div
      role="tablist"
      aria-label="Filter by category"
      // `shrink-0` keeps the tab row visible inside the page's fit-to-
      // screen flex column — without it the parent's `min-h-0` grid would
      // happily collapse this row to zero height when the list fills up.
      className="scrollbar-none -mx-1 flex shrink-0 items-center gap-1.5 overflow-x-auto px-1"
    >
      {visible.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={cn(
              'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold capitalize transition-all',
              isActive
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-card text-foreground border-border hover:border-primary/40 hover:bg-muted',
            )}
          >
            {t.swatch && (
              <span className={cn('h-2 w-2 rounded-full', t.swatch)} aria-hidden />
            )}
            {t.label}
            <span
              className={cn(
                'inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[0.6rem] font-bold tabular-nums',
                isActive
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {t.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function TopRanking({
  places,
  activeCat,
}: {
  places: TripPlace[];
  /** When set to a specific bucket, only that bucket's leaderboard renders. */
  activeCat: PlaceBucket | 'all';
}) {
  // Group voted places by high-level bucket, then take Top 3 of each. We
  // sort the buckets by their bucket-internal #1's vote count so the
  // strongest leaderboard sits at the top of the panel. When `activeCat`
  // narrows to one bucket the grouped output collapses to that one entry,
  // keeping the sidebar consistent with the category tabs.
  const grouped = useMemo(() => {
    const byBucket = new Map<PlaceBucket, TripPlace[]>();
    for (const p of places) {
      if (p.voteCount <= 0) continue;
      const b = bucketFor(p.category);
      if (activeCat !== 'all' && b !== activeCat) continue;
      const list = byBucket.get(b) ?? [];
      list.push(p);
      byBucket.set(b, list);
    }
    const out: Array<{ bucket: PlaceBucket; top: TripPlace[] }> = [];
    for (const [bucket, list] of byBucket) {
      const sorted = [...list].sort((a, b) => {
        if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
        return a.createdAt.localeCompare(b.createdAt);
      });
      out.push({ bucket, top: sorted.slice(0, 3) });
    }
    out.sort((a, b) => (b.top[0]?.voteCount ?? 0) - (a.top[0]?.voteCount ?? 0));
    return out;
  }, [places, activeCat]);

  // Snapshot the previous within-bucket rank of every place so we can show
  // ▲/▼/NEW deltas as votes come in. Keyed by place id (still unique
  // across buckets) so a place crossing into a different bucket counts as
  // "new" — which is what users would expect to see.
  const prevRanksRef = useRef<Map<string, number>>(new Map());
  const [deltas, setDeltas] = useState<Map<string, RankDelta>>(new Map());

  useEffect(() => {
    const next = new Map<string, number>();
    for (const { top } of grouped) {
      top.forEach((p, idx) => next.set(p.id, idx));
    }

    const computed = new Map<string, RankDelta>();
    for (const [id, rank] of next) {
      const prev = prevRanksRef.current.get(id);
      if (prev === undefined) {
        if (prevRanksRef.current.size > 0) computed.set(id, { kind: 'new' });
      } else if (prev > rank) {
        computed.set(id, { kind: 'up', by: prev - rank });
      } else if (prev < rank) {
        computed.set(id, { kind: 'down', by: rank - prev });
      }
    }
    setDeltas(computed);
    prevRanksRef.current = next;

    const timer = setTimeout(() => setDeltas(new Map()), 4000);
    return () => clearTimeout(timer);
  }, [grouped]);

  return (
    <div className="border-border bg-card rounded-2xl border p-5">
      <h3 className="text-foreground flex items-center gap-2 text-sm font-bold">
        <BarChart3 className="text-primary h-4 w-4" strokeWidth={2} />
        Top by category
      </h3>
      <div className="bg-border mt-3 h-px" />
      {grouped.length === 0 ? (
        <RankingEmptyState />
      ) : (
        <div className="mt-4 space-y-5">
          {grouped.map(({ bucket, top }) => {
            const meta = BUCKETS[bucket];
            return (
              <section key={bucket}>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-foreground inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
                    <span className={cn('h-2 w-2 rounded-full', meta.swatch)} aria-hidden />
                    {meta.label}
                  </h4>
                  <span className="text-muted-foreground text-[0.65rem] tabular-nums">
                    Top {top.length}
                  </span>
                </div>
                <ol className="space-y-2">
                  {top.map((p, idx) => (
                    <RankingRow
                      key={p.id}
                      place={p}
                      rank={idx}
                      delta={deltas.get(p.id)}
                    />
                  ))}
                </ol>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

type RankDelta = { kind: 'up' | 'down'; by: number } | { kind: 'new' };

function RankingRow({
  place,
  rank,
  delta,
}: {
  place: TripPlace;
  rank: number;
  delta: RankDelta | undefined;
}) {
  return (
    <li
      className={cn(
        'animate-in fade-in-0 slide-in-from-right-1 flex items-center gap-3 rounded-lg px-2 py-2 transition-all duration-300',
        rank === 0 && 'bg-primary/5',
      )}
    >
      <RankBadge rank={rank} />
      <div className="min-w-0 flex-1">
        <p className="text-foreground truncate text-sm font-semibold leading-tight">
          {place.name}
        </p>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="bg-muted text-muted-foreground inline-block rounded-full px-2 py-0.5 text-[0.65rem] font-medium">
            {place.voteCount} {place.voteCount === 1 ? 'Vote' : 'Votes'}
          </span>
          {delta && <DeltaChip delta={delta} />}
        </div>
      </div>
    </li>
  );
}

function RankBadge({ rank }: { rank: number }) {
  // Top 3 get a trophy disc; 4th–5th get a plain numeral.
  const tone = TROPHY_TONE[rank];
  if (tone) {
    return (
      <span
        className={cn(
          'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          tone.bg,
          tone.text,
        )}
        aria-label={`Rank ${rank + 1}`}
      >
        <Trophy className="h-4 w-4" strokeWidth={2.25} />
      </span>
    );
  }
  return (
    <span
      className="text-muted-foreground inline-flex h-8 w-8 shrink-0 items-center justify-center text-base font-bold tabular-nums"
      aria-label={`Rank ${rank + 1}`}
    >
      {rank + 1}
    </span>
  );
}

const TROPHY_TONE: Array<{ bg: string; text: string }> = [
  { bg: 'bg-amber-100 dark:bg-amber-500/15', text: 'text-amber-600 dark:text-amber-400' },
  { bg: 'bg-slate-100 dark:bg-slate-500/15', text: 'text-slate-500 dark:text-slate-300' },
  { bg: 'bg-orange-100 dark:bg-orange-500/15', text: 'text-orange-600 dark:text-orange-400' },
];

function DeltaChip({ delta }: { delta: RankDelta }) {
  if (delta.kind === 'new') {
    return (
      <span className="bg-primary/10 text-primary animate-in fade-in-0 zoom-in-95 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide duration-300">
        New
      </span>
    );
  }
  if (delta.kind === 'up') {
    return (
      <span className="bg-success/10 text-success animate-in fade-in-0 slide-in-from-bottom-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[0.65rem] font-bold tabular-nums duration-300">
        <ChevronUp className="h-2.5 w-2.5" strokeWidth={3} />
        {delta.by}
      </span>
    );
  }
  return (
    <span className="bg-destructive/10 text-destructive animate-in fade-in-0 slide-in-from-top-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[0.65rem] font-bold tabular-nums duration-300">
      <ChevronDown className="h-2.5 w-2.5" strokeWidth={3} />
      {delta.by}
    </span>
  );
}

function RankingEmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <div className="bg-muted text-muted-foreground flex h-10 w-10 items-center justify-center rounded-full">
        <Trophy className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <p className="text-foreground text-xs font-semibold">No leaders yet</p>
      <p className="text-muted-foreground max-w-[14rem] text-[0.7rem] leading-relaxed">
        Cast the first vote to crown a place at the top.
      </p>
    </div>
  );
}

function EmptyState({ tab, onGoToPlan }: { tab: Tab; onGoToPlan: () => void }) {
  if (tab === 'vote') {
    return (
      <div className="border-border bg-card animate-in fade-in-0 slide-in-from-bottom-2 flex min-h-[20rem] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-8 text-center duration-500">
        <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-full">
          <Sparkles className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <div className="space-y-1">
          <p className="text-foreground text-base font-bold">Nothing to vote on yet</p>
          <p className="text-muted-foreground mx-auto max-w-xs text-sm leading-relaxed">
            Pick a few candidate places first — then come back here to rank them with your group.
          </p>
        </div>
        <Button onClick={onGoToPlan} size="sm" variant="outline" className="mt-2 gap-2">
          Add candidates
          <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </Button>
      </div>
    );
  }
  return (
    <div className="border-border bg-card animate-in fade-in-0 slide-in-from-bottom-2 flex min-h-[20rem] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-8 text-center duration-500">
      <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-full">
        <MapPinned className="h-6 w-6" strokeWidth={1.75} />
      </div>
      <div className="space-y-1">
        <p className="text-foreground text-base font-bold">No places picked yet</p>
        <p className="text-muted-foreground mx-auto max-w-xs text-sm leading-relaxed">
          Tap any spot on the map (cafés, attractions, restaurants…) and add it as a candidate.
        </p>
      </div>
    </div>
  );
}

/** Sort by voteCount desc then createdAt asc, mirroring the API's ORDER BY. */
function sortPlaces(list: TripPlace[]): TripPlace[] {
  return [...list].sort((a, b) => {
    if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
    return a.createdAt.localeCompare(b.createdAt);
  });
}
