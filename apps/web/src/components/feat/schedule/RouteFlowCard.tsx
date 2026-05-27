import { Clock, Flag, FlagTriangleRight, Map as MapIcon } from 'lucide-react';
import { cn } from '@trip-flow/ui/lib/cn';
import type { ScheduleItem } from '@/types/schedule';
import {
  buildFullDayDirectionsUrl,
  buildMapsDirectionsUrl,
  categoryIconFor,
  formatDuration,
  formatTime,
  toneFor,
} from '@/utils/schedule';

export function RouteFlowCard({ items }: { items: ScheduleItem[] }) {
  if (items.length === 0) {
    return <RouteFlowEmpty />;
  }

  const activeMinutes = items.reduce((sum, it) => sum + it.durationMinutes, 0);
  const firstStart = items[0]!.startMinute;
  const lastEnd = items[items.length - 1]!.startMinute + items[items.length - 1]!.durationMinutes;
  const fullRouteUrl = buildFullDayDirectionsUrl(items);

  return (
    <div className="border-border bg-card rounded-2xl border p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
        <div className="flex items-center gap-2">
          <h3 className="text-foreground text-xs font-bold uppercase tracking-wide">Route flow</h3>
          <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[0.65rem] font-semibold">
            {items.length} {items.length === 1 ? 'stop' : 'stops'}
          </span>
        </div>
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.7rem] tabular-nums sm:gap-3">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" strokeWidth={2.25} />
            {formatDuration(activeMinutes)} active
          </span>
          <span className="hidden sm:inline">
            {formatTime(firstStart)} → {formatTime(lastEnd)}
          </span>
          {fullRouteUrl && (
            <a
              href={fullRouteUrl}
              target="_blank"
              rel="noreferrer"
              title="Open the full day's route in Google Maps"
              className="border-border hover:bg-muted hover:text-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold transition-colors"
            >
              <MapIcon className="h-3 w-3" strokeWidth={2.25} />
              View route
            </a>
          )}
        </div>
      </div>

      <div className="scrollbar-none -mx-1 flex items-stretch gap-1 overflow-x-auto px-1 pb-1">
        {items.map((item, idx) => (
          <RouteFlowStep
            key={item.id}
            index={idx}
            total={items.length}
            item={item}
            next={items[idx + 1]}
          />
        ))}
      </div>
    </div>
  );
}

function RouteFlowEmpty() {
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
  const visibleOn = ['', '', '', 'hidden sm:flex', 'hidden sm:flex', 'hidden sm:flex'];
  return (
    <div className="border-border bg-card rounded-2xl border border-dashed p-3 sm:p-5">
      <div className="text-muted-foreground mb-3 text-center text-xs">
        Your route flow will appear here once you schedule stops for the day.
      </div>
      <div className="flex items-center justify-center gap-2 opacity-50">
        {letters.map((letter, idx) => {
          const isLast = idx === letters.length - 1;
          const isMobileLast = idx === 2;
          return (
            <div key={letter} className={cn('flex shrink-0 items-center gap-2', visibleOn[idx])}>
              <div className="border-border bg-muted/40 flex h-10 w-20 items-center gap-1.5 rounded-lg border px-2">
                <span className="bg-muted text-muted-foreground inline-flex h-5 w-5 items-center justify-center rounded-full text-[0.65rem] font-bold">
                  {letter}
                </span>
                <div className="bg-muted h-1.5 flex-1 rounded-full" />
              </div>
              {!isLast && (
                <svg
                  viewBox="0 0 32 8"
                  className={cn(
                    'text-muted-foreground h-2 w-6',
                    isMobileLast && 'sm:inline hidden',
                  )}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <path d="M2 4 H 30" strokeDasharray="3 3" />
                </svg>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface RouteFlowStepProps {
  index: number;
  total: number;
  item: ScheduleItem;
  next: ScheduleItem | undefined;
}

function RouteFlowStep({ index, total, item, next }: RouteFlowStepProps) {
  const tone = toneFor(item.id);
  const Icon = categoryIconFor(item.place.category);
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const Pin = isFirst ? Flag : isLast ? FlagTriangleRight : null;

  return (
    <>
      <div className="group/step relative flex shrink-0 items-stretch">
        <div
          className={cn(
            'flex h-full min-w-[12rem] max-w-[16rem] items-center gap-2.5 rounded-xl border p-2 transition-shadow',
            tone.bg,
            tone.border,
            'hover:shadow-md',
          )}
        >
          {item.place.photoUrl ? (
            <div className="relative h-12 w-12 shrink-0">
              <img
                src={item.place.photoUrl}
                alt=""
                loading="lazy"
                className="h-12 w-12 rounded-lg object-cover"
              />
              <span className="bg-primary-foreground text-primary ring-primary absolute -left-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[0.6rem] font-bold shadow ring-2">
                {Pin ? <Pin className="h-3 w-3" strokeWidth={2.5} /> : index + 1}
              </span>
            </div>
          ) : (
            <div className="bg-primary-foreground text-primary relative flex h-12 w-12 shrink-0 items-center justify-center rounded-lg">
              <Icon className="h-5 w-5" strokeWidth={2} />
              <span className="bg-primary-foreground text-primary ring-primary absolute -left-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[0.6rem] font-bold shadow ring-2">
                {Pin ? <Pin className="h-3 w-3" strokeWidth={2.5} /> : index + 1}
              </span>
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <Icon className={cn('h-3 w-3 shrink-0', tone.text)} strokeWidth={2.25} aria-hidden />
              <span className={cn('truncate text-xs font-semibold', tone.text)}>
                {item.place.name}
              </span>
            </div>
            <p className="text-primary-foreground/80 mt-0.5 text-[0.65rem] tabular-nums">
              {formatTime(item.startMinute)} · {formatDuration(item.durationMinutes)}
            </p>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 opacity-0 transition-opacity duration-150 group-hover/step:opacity-100">
          <div className="border-border bg-popover text-popover-foreground rounded-lg border p-2 shadow-lg">
            <div className="flex gap-2">
              {item.place.photoUrl ? (
                <img
                  src={item.place.photoUrl}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-md object-cover"
                />
              ) : (
                <div
                  className={cn(
                    'flex h-14 w-14 shrink-0 items-center justify-center rounded-md text-white',
                    tone.bar,
                  )}
                >
                  <Icon className="h-6 w-6" strokeWidth={2} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold">{item.place.name}</p>
                <p className="text-muted-foreground mt-0.5 text-[0.65rem] tabular-nums">
                  {formatTime(item.startMinute)} –{' '}
                  {formatTime(item.startMinute + item.durationMinutes)}
                </p>
                {item.place.openingHoursText && (
                  <p className="text-muted-foreground mt-0.5 truncate text-[0.65rem]">
                    {item.place.openingHoursText}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {next && (
        <RouteFlowConnector
          from={item}
          to={next}
          gapMinutes={Math.max(0, next.startMinute - (item.startMinute + item.durationMinutes))}
        />
      )}
    </>
  );
}

function RouteFlowConnector({
  from,
  to,
  gapMinutes,
}: {
  from: ScheduleItem;
  to: ScheduleItem;
  gapMinutes: number;
}) {
  return (
    <a
      href={buildMapsDirectionsUrl(from, to)}
      target="_blank"
      rel="noreferrer"
      title={`Open directions from ${from.place.name} to ${to.place.name}`}
      className="text-muted-foreground/70 hover:text-primary group/arrow relative flex shrink-0 flex-col items-center self-start px-1 pt-5"
      style={{ minWidth: '3rem' }}
    >
      <svg
        viewBox="0 0 48 12"
        className="h-3 w-12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        aria-hidden
      >
        <path d="M2 6 H 38" strokeDasharray="4 4" className="animate-route-flow" />
        <path d="M36 2 L42 6 L36 10" strokeLinejoin="round" />
      </svg>
      <span className="mt-0.5 text-[0.6rem] tabular-nums">
        {gapMinutes > 0 ? `+${formatDuration(gapMinutes)}` : '—'}
      </span>
    </a>
  );
}
