import { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, ChevronDown, ChevronUp, Trophy } from 'lucide-react';
import { cn } from '@trip-flow/ui/lib/cn';
import { BUCKETS, bucketFor, type PlaceBucket } from '../buckets';
import type { RankDelta, TripPlace } from '@/types/places';

const TROPHY_TONE: Array<{ bg: string; text: string }> = [
  { bg: 'bg-amber-100 dark:bg-amber-500/15', text: 'text-amber-600 dark:text-amber-400' },
  { bg: 'bg-slate-100 dark:bg-slate-500/15', text: 'text-slate-500 dark:text-slate-300' },
  { bg: 'bg-orange-100 dark:bg-orange-500/15', text: 'text-orange-600 dark:text-orange-400' },
];

interface TopRankingProps {
  places: TripPlace[];
  activeCat: PlaceBucket | 'all';
}

export function TopRanking({ places, activeCat }: TopRankingProps) {
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
                    <RankingRow key={p.id} place={p} rank={idx} delta={deltas.get(p.id)} />
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
        <p className="text-foreground truncate text-sm font-semibold leading-tight">{place.name}</p>
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
