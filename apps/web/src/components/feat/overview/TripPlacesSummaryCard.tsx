import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  Calendar,
  MapPin,
  Clock,
  ExternalLink,
  Route,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import type { TripDetail } from '@/types/trips';
import type { ScheduleItem } from '@/types/schedule';
import { useSchedule } from '@/hooks/useSchedule';
import {
  buildDays,
  formatTime,
  formatDuration,
  categoryIconFor,
  buildFullDayDirectionsUrl,
} from '@/utils/schedule';
import { useTranslation } from 'react-i18next';
import { Button } from '@trip-flow/ui/components/button';
import { Skeleton } from '@trip-flow/ui/components/skeleton';

interface TripPlacesSummaryCardProps {
  trip: TripDetail;
  className?: string;
}

export function TripPlacesSummaryCard({ trip, className = '' }: TripPlacesSummaryCardProps) {
  const { data: schedule, isLoading, error } = useSchedule(trip.id);
  const { t } = useTranslation();
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({ 0: true });

  const days = useMemo(() => buildDays(trip.startsOn, trip.endsOn), [trip.startsOn, trip.endsOn]);

  const groupedItems = useMemo(() => {
    if (!schedule) return {};
    const grouped: Record<number, ScheduleItem[]> = {};
    for (const item of schedule) {
      const dayIdx = item.dayIndex;
      let dayList = grouped[dayIdx];
      if (!dayList) {
        dayList = [];
        grouped[dayIdx] = dayList;
      }
      dayList.push(item);
    }
    for (const dayIndex in grouped) {
      const list = grouped[dayIndex];
      if (list) {
        list.sort((a, b) => a.startMinute - b.startMinute);
      }
    }
    return grouped;
  }, [schedule]);

  const toggleDay = (dayIndex: number) => {
    setExpandedDays((prev) => ({
      ...prev,
      [dayIndex]: !prev[dayIndex],
    }));
  };

  const expandAll = () => {
    const next: Record<number, boolean> = {};
    days.forEach((d) => {
      next[d.index] = true;
    });
    setExpandedDays(next);
  };

  const collapseAll = () => {
    setExpandedDays({});
  };

  const totalScheduled = schedule?.length ?? 0;

  if (error) {
    return (
      <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-2xl border p-6 text-sm">
        <p className="font-semibold">
          {t('overview.failedLoadSchedule', 'Failed to load schedule overview')}
        </p>
        <p className="mt-1 text-xs opacity-90">{error.message}</p>
      </div>
    );
  }

  return (
    <div
      className={`border-border bg-card rounded-2xl border p-6 shadow-xs flex flex-col ${className}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4 mb-4 shrink-0">
        <div>
          <h4 className="text-foreground font-headline text-base font-bold flex items-center gap-2">
            <Route className="text-primary h-5 w-5" />
            {t('overview.itinerarySummary', 'Daily Itinerary Summary')}
          </h4>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {totalScheduled > 0
              ? t(
                  'overview.itineraryScheduled',
                  '{{total}} places scheduled across {{days}} days',
                  { total: totalScheduled, days: days.length },
                )
              : t('overview.itineraryPlan', 'Plan daily activities and routes')}
          </p>
        </div>
        {totalScheduled > 0 && (
          <div className="flex gap-2">
            <button
              type="button"
              className="text-xs font-semibold px-2.5 py-1 border border-border hover:bg-muted rounded-md transition-colors"
              onClick={expandAll}
            >
              {t('overview.expandAll', 'Expand all')}
            </button>
            <button
              type="button"
              className="text-xs font-semibold px-2.5 py-1 border border-border hover:bg-muted rounded-md transition-colors"
              onClick={collapseAll}
            >
              {t('overview.collapseAll', 'Collapse all')}
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pr-1 -mr-1 scrollbar-none">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ) : totalScheduled === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-8 px-4 border border-dashed border-border rounded-xl bg-muted/20">
            <Calendar className="text-muted-foreground h-8 w-8 mb-2 opacity-50" />
            <p className="text-foreground text-sm font-semibold">
              {t('overview.noPlacesScheduled', 'No places scheduled yet')}
            </p>
            <p className="text-muted-foreground mt-1 text-xs max-w-sm">
              {t(
                'overview.noPlacesScheduledDesc',
                'Drag and schedule your voted candidate places on the time grid to build a beautiful timeline.',
              )}
            </p>
            <Link
              to={`/trips/${trip.id}/schedule`}
              className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex h-8 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t('overview.createSchedule', 'Create schedule')}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {days.map((day) => {
              const items = groupedItems[day.index] ?? [];
              const isExpanded = !!expandedDays[day.index];
              const mapsUrl = buildFullDayDirectionsUrl(items);

              return (
                <div
                  key={day.index}
                  className={`border border-border rounded-xl transition-all duration-200 overflow-hidden ${
                    isExpanded ? 'bg-muted/10' : 'bg-transparent hover:bg-muted/5'
                  }`}
                >
                  {/* Accordion Trigger */}
                  <button
                    type="button"
                    className="w-full text-left p-4 flex items-center justify-between gap-4 select-none focus:outline-none"
                    onClick={() => toggleDay(day.index)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center justify-center bg-primary/10 text-primary rounded-lg px-2.5 py-1.5 min-w-[3.25rem] text-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 leading-none">
                          {t('overview.dayNumber', 'Day')}
                        </span>
                        <span className="text-base font-extrabold mt-0.5 leading-none">
                          {day.index + 1}
                        </span>
                      </div>
                      <div>
                        <h5 className="text-foreground text-sm font-bold leading-tight">
                          {day.date.toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </h5>
                        <span className="text-muted-foreground text-xs flex items-center gap-1.5 mt-0.5">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {items.length === 0
                            ? t('overview.noStops', 'No stops scheduled')
                            : t('overview.stops', '{{count}} stops', { count: items.length })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronUp className="text-muted-foreground h-4 w-4 shrink-0" />
                      ) : (
                        <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0" />
                      )}
                    </div>
                  </button>

                  {/* Accordion Content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-border/40 pt-4 bg-card/40">
                      {items.length === 0 ? (
                        <div className="text-center py-5">
                          <p className="text-muted-foreground text-xs">
                            {t('overview.noStopsDay', 'No stops scheduled for this day.')}
                          </p>
                          <Link
                            to={`/trips/${trip.id}/schedule?day=${day.index}`}
                            className="mt-2 text-primary hover:underline text-xs inline-flex items-center gap-1 font-semibold"
                          >
                            {t('overview.schedulePlaces', 'Schedule some places')}
                            <ChevronRight className="h-3 w-3" />
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Timeline list */}
                          <div className="relative pl-6 space-y-7 before:absolute before:left-[11px] before:top-[12px] before:bottom-[12px] before:w-[2px] before:bg-border/60">
                            {items.map((item) => {
                              const IconComp = categoryIconFor(item.place.category);
                              return (
                                <div key={item.id} className="relative group">
                                  {/* Timeline Bullet Icon */}
                                  <span className="absolute -left-[27px] top-[2px] flex items-center justify-center bg-background border-2 border-primary text-primary rounded-full w-[24px] h-[24px] z-10 shadow-xs">
                                    <IconComp className="h-3.5 w-3.5" />
                                  </span>

                                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                      <h6 className="text-foreground text-xs font-bold leading-tight group-hover:text-primary transition-colors">
                                        {item.place.name}
                                      </h6>
                                      {item.place.address && (
                                        <p className="text-muted-foreground text-[11px] mt-0.5 line-clamp-1 max-w-md">
                                          {item.place.address}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 sm:mt-0 shrink-0">
                                      <span className="bg-muted text-muted-foreground font-mono text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatTime(item.startMinute)} (
                                        {formatDuration(item.durationMinutes)})
                                      </span>
                                    </div>
                                  </div>
                                  {item.notes && (
                                    <p className="bg-muted/40 border-l-2 border-primary/20 text-muted-foreground italic text-[10px] p-1.5 mt-1.5 rounded-r">
                                      "{item.notes}"
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Actions for the day */}
                          <div className="flex flex-col sm:flex-row gap-2 border-t border-border/40 pt-3.5 mt-1">
                            {mapsUrl && (
                              <a
                                href={mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="border border-border hover:border-primary/20 hover:bg-primary/5 text-foreground inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                              >
                                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                                {t('overview.directionsMaps', 'Directions in Google Maps')}
                              </a>
                            )}
                            <Link
                              to={`/trips/${trip.id}/schedule?day=${day.index}`}
                              className="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                            >
                              {t('overview.editSchedule', 'Edit Schedule')}
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
