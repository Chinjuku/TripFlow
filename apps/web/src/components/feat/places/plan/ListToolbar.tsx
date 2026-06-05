import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpDown, Check, ChevronDown, ListChecks, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import type { SortKey } from '@/types/places';
import { useTranslation } from 'react-i18next';

// We will generate SORTS dynamically inside the component since they use translations.

interface ListToolbarProps {
  sortKey: SortKey;
  onSortChange: (next: SortKey) => void;
  bulkMode: boolean;
  onToggleBulkMode: () => void;
  bulkSelected: Set<string>;
  onBulkDelete: () => void;
  bulkBusy: boolean;
}

export function ListToolbar({
  sortKey,
  onSortChange,
  bulkMode,
  onToggleBulkMode,
  bulkSelected,
  onBulkDelete,
  bulkBusy,
}: ListToolbarProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        'flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2',
        bulkMode && 'bg-primary/5 border-primary/30 -mx-2 rounded-xl border p-2',
      )}
    >
      <div className="hidden flex-1 sm:block" />

      <SortPicker value={sortKey} onChange={onSortChange} />

      {bulkMode ? (
        <div className="inline-flex items-center gap-2">
          <span className="text-muted-foreground text-xs font-semibold tabular-nums">
            {bulkSelected.size} {t('plan.selected', 'selected')}
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
            {bulkBusy ? t('plan.deleting', 'Deleting…') : t('plan.delete', 'Delete')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onToggleBulkMode}
            className="h-8 rounded-full"
          >
            {t('plan.done', 'Done')}
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
          {t('plan.select', 'Select')}
        </Button>
      )}
    </div>
  );
}

function SortPicker({ value, onChange }: { value: SortKey; onChange: (next: SortKey) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const SORTS: Array<{ id: SortKey; label: string }> = useMemo(
    () => [
      { id: 'votes', label: t('plan.sortMostVotes', 'Most votes') },
      { id: 'name', label: t('plan.sortNameAZ', 'Name (A–Z)') },
      { id: 'recent', label: t('plan.sortRecentlyAdded', 'Recently added') },
    ],
    [t],
  );

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
