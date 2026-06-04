import {
  Coffee,
  History,
  Landmark,
  Layers,
  Search,
  Utensils,
  Wine,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@trip-flow/ui/components/button';
import { Input } from '@trip-flow/ui/components/input';
import { cn } from '@trip-flow/ui/lib/cn';

/* ----------------------------- Category filter ---------------------------- */

export interface CategoryFilter {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  /** Google Places "included type" - see Places API (New) docs. */
  includedType: string;
}

export const CATEGORY_FILTERS = [
  { id: 'cafe', labelKey: 'plan.catCafe', icon: Coffee, includedType: 'cafe' },
  { id: 'restaurant', labelKey: 'plan.catFood', icon: Utensils, includedType: 'restaurant' },
  {
    id: 'attraction',
    labelKey: 'plan.catAttraction',
    icon: Landmark,
    includedType: 'tourist_attraction',
  },
  { id: 'bar', labelKey: 'plan.catBar', icon: Wine, includedType: 'bar' },
] as const satisfies readonly CategoryFilter[];

export function CategoryFilterRow({
  active,
  onClick,
}: {
  active: string | null;
  onClick: (filter: CategoryFilter) => void;
}) {
  const { t } = useTranslation();
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
            {t(f.labelKey)}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------- Search bar ------------------------------ */

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

export function SearchBar({
  value,
  onChange,
  onSubmit,
  onClear,
  onFocus,
  onBlur,
  searching,
  hasResults,
}: SearchBarProps) {
  const { t } = useTranslation();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="bg-card border-border flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-2.5 shadow-md"
    >
      <Search className="text-muted-foreground ml-2 h-4 w-4 shrink-0" strokeWidth={2} />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={t('plan.mapSearchPlaceholder')}
        className="h-8 flex-1 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
      />
      {hasResults && (
        <button
          type="button"
          onClick={onClear}
          aria-label={t('plan.mapClearSearch')}
          className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-7 w-7 items-center justify-center rounded-full"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      )}
      <Button type="submit" size="sm" className="h-8 px-3" disabled={searching || !value.trim()}>
        {searching ? '…' : t('plan.mapSearch')}
      </Button>
    </form>
  );
}

/* --------------------------- Recent searches list ------------------------- */

/**
 * Appears below the empty search bar on focus. Click an item to re-run it.
 * Uses onMouseDown so the click beats the input's onBlur.
 */
export function RecentSearchesDropdown({
  items,
  onPick,
  onClear,
}: {
  items: string[];
  onPick: (query: string) => void;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="bg-card border-border absolute left-0 right-0 top-[calc(100%+0.25rem)] z-20 overflow-hidden rounded-2xl border shadow-lg">
      <div className="border-border text-muted-foreground flex items-center justify-between border-b px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-wider">
        <span className="inline-flex items-center gap-1.5">
          <History className="h-3 w-3" strokeWidth={2} />
          {t('plan.mapRecent')}
        </span>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onClear();
          }}
          className="hover:text-foreground text-[0.65rem] font-semibold"
        >
          {t('plan.mapClear')}
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

/* ------------------------------ Map-type toggle --------------------------- */

export const MAP_TYPES = [
  { id: 'roadmap', labelKey: 'plan.mapTypeRoadmap' },
  { id: 'satellite', labelKey: 'plan.mapTypeSatellite' },
  { id: 'terrain', labelKey: 'plan.mapTypeTerrain' },
] as const;
export type MapTypeId = (typeof MAP_TYPES)[number]['id'];

export function MapTypeToggle({
  value,
  onChange,
}: {
  value: MapTypeId;
  onChange: (next: MapTypeId) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="bg-card border-border absolute bottom-3 right-3 z-10 flex items-center gap-0.5 rounded-full border p-0.5 shadow-md">
      <Layers className="text-muted-foreground ml-2 mr-1 h-3.5 w-3.5" strokeWidth={2} />
      {MAP_TYPES.map((mt) => (
        <button
          key={mt.id}
          type="button"
          onClick={() => onChange(mt.id)}
          aria-pressed={value === mt.id}
          className={cn(
            'rounded-full px-2.5 py-1 text-[0.7rem] font-semibold transition-colors',
            value === mt.id
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {t(mt.labelKey)}
        </button>
      ))}
    </div>
  );
}
