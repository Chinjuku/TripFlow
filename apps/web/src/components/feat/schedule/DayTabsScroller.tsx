import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@trip-flow/ui/lib/cn';
import type { DayInfo } from '@/types/schedule';

interface DayTabsScrollerProps {
  days: DayInfo[];
  activeDay: number;
  onSelect: (index: number) => void;
}

export function DayTabsScroller({ days, activeDay, onSelect }: DayTabsScrollerProps) {
  const { t } = useTranslation();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const dotRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    tabRefs.current[activeDay]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
    dotRefs.current[activeDay]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [activeDay]);

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={scrollerRef}
        className="scrollbar-none flex items-center gap-2 overflow-x-auto scroll-smooth pb-1"
      >
        {days.map((d, idx) => (
          <button
            key={d.index}
            ref={(node) => {
              tabRefs.current[idx] = node;
            }}
            type="button"
            onClick={() => onSelect(d.index)}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors',
              d.index === activeDay
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-foreground border-border hover:bg-muted',
            )}
          >
            <span>{d.subLabel}</span>
            <span className="opacity-60">•</span>
            <span>{d.label}</span>
          </button>
        ))}
      </div>

      {days.length > 1 && (
        <div
          role="tablist"
          aria-label={t('schedule.dayNavigator')}
          className="scrollbar-none flex items-center justify-center gap-1.5 overflow-x-auto"
        >
          {days.map((d, idx) => {
            const active = d.index === activeDay;
            return (
              <button
                key={d.index}
                ref={(node) => {
                  dotRefs.current[idx] = node;
                }}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={`${d.label} (${d.subLabel})`}
                onClick={() => onSelect(d.index)}
                className={cn(
                  'shrink-0 rounded-full transition-all',
                  active
                    ? 'bg-primary h-1.5 w-4'
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/60 h-1.5 w-1.5',
                )}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
