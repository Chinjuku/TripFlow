import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, MapPin, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@trip-flow/ui/lib/cn';
import { filterProvinces, type ThaiProvince } from '@/utils/thai-provinces';

const MENU_GAP = 4;
const MENU_HEIGHT_ESTIMATE = 320;

/** Nearest <dialog> ancestor (or body) so the portal escapes modal overflow. */
function findPortalHost(node: HTMLElement | null): HTMLElement {
  let el: HTMLElement | null = node;
  while (el) {
    if (el.tagName === 'DIALOG') return el;
    el = el.parentElement;
  }
  return document.body;
}

/** Result handed back to the caller once a destination is chosen. */
export interface DestinationValue {
  /** Label in the current UI language (Thai/primary copy persisted as name). */
  name: string;
  /** The other-language copy, so the trip can switch destination language. */
  nameEn: string;
  lat: number;
  lng: number;
}

interface DestinationPickerProps {
  value: DestinationValue | null;
  onChange: (next: DestinationValue | null) => void;
  placeholder?: string;
}

/**
 * Province picker - a searchable dropdown over Thailand's 77 provinces
 * (`src/utils/thai-provinces.ts`). Each province carries a capital lat/lng,
 * so the chosen value still anchors the plan map without any Google call.
 *
 * The displayed name follows the active locale (Thai vs English); the stored
 * `name` matches what the user sees so it reads naturally on the trip card.
 */
export function DestinationPicker({ value, onChange, placeholder }: DestinationPickerProps) {
  const { t, i18n } = useTranslation();
  const isThai = i18n.language?.startsWith('th');
  const listId = useId();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const labelOf = (p: ThaiProvince) => (isThai ? p.th : p.en);

  const results = useMemo(() => filterProvinces(query), [query]);

  // Position the portalled menu against the trigger; recompute on scroll/resize.
  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    function update() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const vh = window.innerHeight;
      let top = rect.bottom + MENU_GAP;
      // Flip above if not enough room below.
      if (top + MENU_HEIGHT_ESTIMATE > vh - 8) {
        top = Math.max(8, rect.top - MENU_GAP - MENU_HEIGHT_ESTIMATE);
      }
      setPosition({ top, left: rect.left, width: rect.width });
    }
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  // Close on outside click - checks trigger AND the portalled menu.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
      setQuery('');
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  function selectProvince(p: ThaiProvince) {
    // Persist Thai as the primary copy + English alongside, regardless of the
    // UI language at create time, so the destination can localize later.
    onChange({ name: p.th, nameEn: p.en, lat: p.lat, lng: p.lng });
    setOpen(false);
    setQuery('');
  }

  function openMenu() {
    setOpen(true);
    setQuery('');
    // Focus the search field once the menu paints.
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger - looks like a select, opens the searchable menu. */}
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full items-center gap-2 rounded-md border px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        <MapPin className="text-muted-foreground h-4 w-4 shrink-0" strokeWidth={1.75} />
        <span className={cn('flex-1 truncate text-left', !value && 'text-muted-foreground')}>
          {value ? (isThai ? value.name : value.nameEn || value.name) : placeholder}
        </span>
        {value ? (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Clear destination"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="text-muted-foreground hover:bg-muted hover:text-foreground -mr-1 inline-flex h-6 w-6 items-center justify-center rounded-full"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
        ) : (
          <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0" strokeWidth={2} />
        )}
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: position.top,
              left: position.left,
              width: position.width,
            }}
            className="bg-card border-border animate-in fade-in-0 zoom-in-95 z-[60] overflow-hidden rounded-xl border shadow-lg"
          >
            {/* Search field inside the menu. */}
          <div className="border-border flex items-center gap-2 border-b px-3 py-2">
            <Search className="text-muted-foreground h-4 w-4 shrink-0" strokeWidth={2} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="placeholder:text-muted-foreground flex-1 bg-transparent text-sm outline-none"
            />
          </div>

          <ul id={listId} role="listbox" className="max-h-64 overflow-auto p-1.5">
            {results.length === 0 ? (
              <li className="text-muted-foreground flex flex-col items-center gap-2 px-3 py-8 text-center text-sm">
                <MapPin className="h-6 w-6 opacity-40" strokeWidth={1.5} />
                {t('trips.destinationSearchEmpty')}
              </li>
            ) : (
              results.map((p) => {
                const isActive = value?.name === p.th;
                return (
                  <li key={p.en} role="option" aria-selected={isActive}>
                    <button
                      type="button"
                      onClick={() => selectProvince(p)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                        isActive ? 'bg-primary/10' : 'hover:bg-muted',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                          isActive ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                        )}
                      >
                        <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="text-foreground block truncate font-medium">
                          {labelOf(p)}
                        </span>
                        {!isThai && (
                          <span className="text-muted-foreground block truncate text-xs">
                            {p.th}
                          </span>
                        )}
                      </span>
                      {isActive && (
                        <Check className="text-primary h-4 w-4 shrink-0" strokeWidth={2.5} />
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
          </div>,
          findPortalHost(triggerRef.current),
        )}
    </div>
  );
}
