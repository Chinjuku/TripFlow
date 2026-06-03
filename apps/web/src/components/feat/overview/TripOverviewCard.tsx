import { CalendarRange, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TripDetail } from '@/types/trips';
import { formatLocalizedDateRange } from '@/lib/utils';
import { localized } from '@/utils/places-map';
import { deriveTripStatus, daysUntilStart } from '@/utils/trips';
import { TripStatusBadge } from '@/components/feat/trips';

interface TripOverviewCardProps {
  trip: TripDetail;
}

export function TripOverviewCard({ trip }: TripOverviewCardProps) {
  const { t, i18n } = useTranslation();
  const { range, duration } = formatLocalizedDateRange(trip.startsOn, trip.endsOn, i18n.language);
  const status = deriveTripStatus(trip);
  const days = daysUntilStart(trip);

  // Hero = a "{n} days" figure + a caption underneath. A trip that hasn't
  // started counts down to departure; once running (or over) we show the
  // trip length instead.
  const tripLength = Math.max(
    1,
    Math.round((+new Date(trip.endsOn) - +new Date(trip.startsOn)) / 86400000) + 1,
  );
  const counting = status !== 'past' && status !== 'active' && days > 0;
  const heroDays = counting ? days : tripLength;
  const heroFigure = t('common.days', { count: heroDays });
  const heroCaption = counting
    ? t('overview.daysToGo')
    : status === 'past'
      ? t('overview.countdownEnded')
      : status === 'active'
        ? t('overview.countdownActive')
        : t('overview.countdownToday');

  return (
    <div className="border-border bg-card overflow-hidden rounded-2xl border">
      {/* Hero — big number with the status badge (flat band, no gradient). */}
      <div className="border-border bg-muted/30 flex items-center justify-between gap-3 border-b px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-0.5">
          <span className="text-foreground font-headline text-3xl font-extrabold leading-none tabular-nums sm:text-4xl">
            {heroFigure}
          </span>
          <span className="text-muted-foreground text-xs font-medium">{heroCaption}</span>
        </div>
        <TripStatusBadge status={status} />
      </div>

      {/* Stat tiles — dates + destination (members live in the collaborators
          panel, so they're not repeated here). */}
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-6">
        <StatTile icon={CalendarRange} label={t('overview.dates')}>
          <span className="text-foreground text-sm font-bold">
            {range}
            <span className="text-muted-foreground ml-1 font-normal">({duration})</span>
          </span>
        </StatTile>
        <StatTile icon={MapPin} label={t('overview.destination')}>
          <span className="text-foreground truncate text-sm font-bold">
            {localized(i18n.language, trip.destinationName, trip.destinationNameEn)}
          </span>
        </StatTile>
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof CalendarRange;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-border bg-muted/30 flex items-start gap-3 rounded-xl border p-3">
      <span className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
        <Icon className="h-4 w-4" strokeWidth={2} />
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="text-muted-foreground text-[0.65rem] font-semibold uppercase tracking-wide">
          {label}
        </span>
        <div className="mt-0.5 flex flex-col">{children}</div>
      </div>
    </div>
  );
}
