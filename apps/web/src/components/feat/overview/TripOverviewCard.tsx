import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TripDetail } from '@/types/trips';
import { formatDateRange } from '@/utils/trips';

interface TripOverviewCardProps {
  trip: TripDetail;
}

export function TripOverviewCard({ trip }: TripOverviewCardProps) {
  const { range, duration } = formatDateRange(trip.startsOn, trip.endsOn);
  const { t } = useTranslation();

  return (
    <div className="border-border bg-card rounded-2xl border p-6">
      <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
            {t('overview.dates')}
          </dt>
          <dd className="text-foreground mt-1 text-base font-semibold">{range}</dd>
          <dd className="text-muted-foreground text-sm">{duration}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
            {t('overview.members')}
          </dt>
          <dd className="text-foreground mt-1 text-base font-semibold">
            {t('common.travellers', { count: trip.members.length })}
          </dd>
        </div>
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
  );
}
