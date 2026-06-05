import { useTranslation } from 'react-i18next';
import { BUCKETS } from '@/utils/places';
import type { PlaceBucket, TripPlace } from '@/types/places';
import { DraggablePlace, PlacePill } from './DraggablePlace';
import { DuplicateModeToggle } from './DuplicateModeToggle';
import { PlaceListSkeleton } from '../ScheduleSkeletons';
import { TappablePlace } from '../timeline/MobileTimeline';

interface TopVotedGroup {
  bucket: PlaceBucket;
  items: TripPlace[];
}

interface TopVotedPanelProps {
  /** null while places are still loading. */
  places: TripPlace[] | null;
  count: number;
  groups: TopVotedGroup[];
  allowDuplicates: boolean;
  onModeChange: (allow: boolean) => void;
  isMobile: boolean;
  onPick: (place: TripPlace) => void;
}

/** Sidebar listing the remaining top-voted places, grouped by category. */
export function TopVotedPanel({
  places,
  count,
  groups,
  allowDuplicates,
  onModeChange,
  isMobile,
  onPick,
}: TopVotedPanelProps) {
  const { t } = useTranslation();

  return (
    <aside className="border-border bg-card rounded-2xl border p-3 sm:p-5 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto">
      <div className="border-border mb-3 flex items-center justify-between gap-2 border-b pb-3">
        <h3 className="text-foreground font-headline text-sm font-bold sm:text-base">
          {t('schedule.topVotedPlaces', 'Top Voted Places')}
        </h3>
        <span className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-semibold">
          {t('schedule.itemsCount', '{{count}} items', { count })}
        </span>
      </div>

      <DuplicateModeToggle value={allowDuplicates} onChange={onModeChange} />

      <p className="text-muted-foreground mb-4 mt-3 text-xs">
        {allowDuplicates
          ? t(
              'schedule.allowDuplicatesOn',
              'A place can repeat across days, handy for daily stops.',
            )
          : t('schedule.allowDuplicatesOff', 'Each place appears once across the whole trip.')}
      </p>

      {!places ? (
        <PlaceListSkeleton />
      ) : count === 0 ? (
        <p className="text-muted-foreground text-sm">
          {t('schedule.noMoreCandidates', 'No more candidates left to schedule.')}
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map(({ bucket, items }) => (
            <div key={bucket} className="space-y-2.5">
              {/* Category heading - swatch dot + label + count. */}
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${BUCKETS[bucket].swatch}`} />
                <h4 className="text-muted-foreground text-[0.7rem] font-bold uppercase tracking-wide">
                  {t(BUCKETS[bucket].labelKey)}
                </h4>
                <span className="text-muted-foreground/70 text-[0.7rem] tabular-nums">
                  {items.length}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
                {items.map((p) =>
                  isMobile ? (
                    <TappablePlace key={p.id} onSelect={() => onPick(p)}>
                      <PlacePill place={p} />
                    </TappablePlace>
                  ) : (
                    <DraggablePlace key={p.id} place={p} />
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
