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

  useEffect(() => {
    tabRefs.current[activeDay]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [activeDay]);

  return (
    <div
      ref={scrollerRef}
      role="tablist"
      aria-label={t('schedule.dayNavigator')}
      className="scrollbar-none flex items-stretch gap-2 overflow-x-auto scroll-smooth pb-1"
    >
      {days.map((d, idx) => {
        const active = d.index === activeDay;
        return (
          <button
            key={d.index}
            ref={(node) => {
              tabRefs.current[idx] = node;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(d.index)}
            className={cn(
              'group/day relative flex shrink-0 flex-col items-start gap-0.5 rounded-xl border px-3.5 py-2 text-left transition-all',
              active
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : 'border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted',
            )}
          >
            <span
              className={cn(
                'text-[0.6rem] font-bold uppercase tracking-wider',
                active ? 'text-primary-foreground/80' : 'text-muted-foreground',
              )}
            >
              {d.label}
            </span>
            <span className="text-sm font-bold leading-none tabular-nums">{d.subLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
