import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  ChevronDown,
  ChevronUp,
  MapPinned,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { Button } from '@trip-flow/ui/components/button';
import { Skeleton } from '@trip-flow/ui/components/skeleton';
import { cn } from '@trip-flow/ui/lib/cn';
import { useAuth } from '@/features/auth/useAuth';
import { useTrip } from '@/features/trips';
import { addPlace, useTripPlaces, type TripPlace } from '@/features/places';
import { PlaceCard, PlacesMap, type PoiPreview } from '@/features/places/components';

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

  function setTab(next: Tab) {
    const params = new URLSearchParams(searchParams);
    if (next === 'plan') params.delete('tab');
    else params.set('tab', next);
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
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
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

      {/* Content */}
      {tab === 'vote' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-4">
            <PlaceList
              loading={isLoading && places === null}
              places={places ?? []}
              tripId={id}
              mode="vote"
              memberById={memberById}
              currentUserId={user?.id}
              onChange={handlePlaceChange}
              onRemove={handlePlaceRemove}
              emptyState={
                <EmptyState tab="vote" onGoToPlan={() => setTab('plan')} />
              }
            />
          </div>
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <TopRanking places={places ?? []} />
          </aside>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[24rem_minmax(0,1fr)]">
          <PlaceList
            loading={isLoading && places === null}
            places={places ?? []}
            tripId={id}
            mode="plan"
            memberById={memberById}
            currentUserId={user?.id}
            hoveredId={hoveredPlaceId}
            onHover={setHoveredPlaceId}
            registerCardRef={(placeId, node) => {
              if (node) cardRefs.current.set(placeId, node);
              else cardRefs.current.delete(placeId);
            }}
            onChange={handlePlaceChange}
            onRemove={handlePlaceRemove}
            emptyState={<EmptyState tab="plan" onGoToPlan={() => setTab('plan')} />}
          />
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="h-[32rem] lg:h-[calc(100dvh-8rem)]">
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
        return (
          <div
            key={place.id}
            ref={(node) => registerCardRef?.(place.id, node)}
            onMouseEnter={() => onHover?.(place.id)}
            onMouseLeave={() => onHover?.(null)}
            className={cn(
              'rounded-2xl transition-shadow duration-200',
              isHovered && 'ring-primary/60 ring-2 ring-offset-2 ring-offset-background',
            )}
          >
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
        );
      })}
    </div>
  );
}

function TopRanking({ places }: { places: TripPlace[] }) {
  const top = useMemo(
    () => places.filter((p) => p.voteCount > 0).slice(0, 5),
    [places],
  );

  // Track each place's previous rank so we can show ▲/▼/NEW deltas as votes
  // come in. We snapshot _after_ rendering so the first paint is neutral —
  // a place that was 3rd a moment ago and is now 1st shows "▲2" the next
  // time its score changes, which is the moment users actually care about.
  const prevRanksRef = useRef<Map<string, number>>(new Map());
  const [deltas, setDeltas] = useState<Map<string, RankDelta>>(new Map());

  useEffect(() => {
    const next = new Map<string, number>();
    top.forEach((p, idx) => next.set(p.id, idx));

    const computed = new Map<string, RankDelta>();
    for (const [id, rank] of next) {
      const prev = prevRanksRef.current.get(id);
      if (prev === undefined) {
        // First time we've seen this place in the top — only flag NEW if we
        // already had some ranks (i.e. this isn't the initial render).
        if (prevRanksRef.current.size > 0) computed.set(id, { kind: 'new' });
      } else if (prev > rank) {
        computed.set(id, { kind: 'up', by: prev - rank });
      } else if (prev < rank) {
        computed.set(id, { kind: 'down', by: rank - prev });
      }
    }
    setDeltas(computed);
    prevRanksRef.current = next;

    // Auto-clear deltas after a short window so they read as "just happened"
    // rather than sticking permanently.
    const timer = setTimeout(() => setDeltas(new Map()), 4000);
    return () => clearTimeout(timer);
  }, [top]);

  return (
    <div className="border-border bg-card rounded-2xl border p-5">
      <h3 className="text-foreground flex items-center gap-2 text-sm font-bold">
        <BarChart3 className="text-primary h-4 w-4" strokeWidth={2} />
        Top 5 Ranking
      </h3>
      <div className="bg-border mt-3 h-px" />
      {top.length === 0 ? (
        <RankingEmptyState />
      ) : (
        <ol className="mt-3 space-y-2">
          {top.map((p, idx) => (
            <RankingRow
              key={p.id}
              place={p}
              rank={idx}
              delta={deltas.get(p.id)}
            />
          ))}
        </ol>
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
