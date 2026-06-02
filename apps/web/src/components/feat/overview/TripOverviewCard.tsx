import { Link } from 'react-router-dom';
import { ArrowRight, CalendarRange, MapPin, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TripDetail } from '@/types/trips';
import { deriveTripStatus, daysUntilStart, formatDateRange } from '@/utils/trips';
import { TripStatusBadge } from '@/components/feat/trips';

interface TripOverviewCardProps {
  trip: TripDetail;
}

export function TripOverviewCard({ trip }: TripOverviewCardProps) {
  const { range, duration } = formatDateRange(trip.startsOn, trip.endsOn);
  const { t } = useTranslation();
  const status = deriveTripStatus(trip);

  // Countdown copy keyed off status + days-to-start.
  const days = daysUntilStart(trip);
  let countdown: string;
  if (status === 'past') countdown = t('overview.countdownEnded');
  else if (status === 'active') countdown = t('overview.countdownActive');
  else if (days <= 0) countdown = t('overview.countdownToday');
  else countdown = t('overview.countdownStartsIn', { count: days });

  return (
    <div className="border-border bg-card overflow-hidden rounded-2xl border">
      {/* Countdown banner — status badge + at-a-glance timing. */}
      <div className="bg-muted/30 border-border flex items-center justify-between gap-3 border-b px-6 py-4">
        <span className="text-foreground text-sm font-semibold">{countdown}</span>
        <TripStatusBadge status={status} />
      </div>

      <div className="p-6">
        <dl className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Stat icon={CalendarRange} label={t('overview.dates')}>
            <span className="text-foreground text-base font-semibold">{range}</span>
            <span className="text-muted-foreground text-sm">{duration}</span>
          </Stat>
          <Stat icon={MapPin} label={t('overview.destination')}>
            <span className="text-foreground text-base font-semibold">{trip.destinationName}</span>
          </Stat>
          <Stat icon={Users} label={t('overview.members')}>
            <span className="text-foreground text-base font-semibold">
              {t('common.travellers', { count: trip.members.length })}
            </span>
          </Stat>
        </dl>

        <Link
          to={`/trips/${trip.id}/plan`}
          className="border-border hover:border-primary/40 hover:bg-muted/40 mt-6 flex items-center justify-between gap-3 rounded-xl border p-4 transition-colors"
        >
          <div>
            <p className="text-foreground text-sm font-semibold">{t('overview.suggestAndVote')}</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {t('overview.suggestAndVoteDesc')}
            </p>
          </div>
          <ArrowRight className="text-muted-foreground h-4 w-4 shrink-0" strokeWidth={2} />
        </Link>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof CalendarRange;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <dt className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        {label}
      </dt>
      <dd className="mt-1.5 flex flex-col">{children}</dd>
    </div>
  );
}
