import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  Image as ImageIcon,
  ListChecks,
  ThumbsUp,
  Trash2,
} from 'lucide-react';
import { Button } from '@trip-flow/ui/components/button';
import { cn } from '@trip-flow/ui/lib/cn';
import type { FilterKey, SortKey, TripPlace } from '@/types/places';

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

export function ListToolbar({
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
  const counts = useMemo(() => {
    const out: Record<FilterKey, number> = { all: places.length, voted: 0, mine: 0, photos: 0 };
    for (const p of places) {
      if (p.voteCount > 0) out.voted += 1;
      if (p.photoUrl) out.photos += 1;
    }
    return out;
  }, [places]);

  return (
    <div
      className={cn(
        'flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2',
        bulkMode && 'bg-primary/5 border-primary/30 -mx-2 rounded-xl border p-2',
      )}
    >
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
                    selected ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted',
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
