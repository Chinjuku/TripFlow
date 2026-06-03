import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useTrip } from '@/components/feat/trips';
import { BackLink } from '@/components/shared/BackLink';
import { TripPageHeader } from '@/components/shared/TripPageHeader';
import {
  TripBoardSkeleton,
  TripOverviewCard,
  CollaboratorsPanel,
  TripPlacesSummaryCard,
} from '@/components/feat/overview';

export default function TripBoardPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: trip, error } = useTrip(id);
  const { t } = useTranslation();

  if (error) {
    return (
      <div className="mx-auto max-w-6xl">
        <BackLink to="/trips" label={t('overview.allTrips')} className="mb-6" />
        <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-4 text-sm">
          {error.message}
        </div>
      </div>
    );
  }

  if (!trip) return <TripBoardSkeleton />;

  const owner = trip.members.find((m) => m.role === 'owner');

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:gap-8">
      <TripPageHeader
        backTo="/trips"
        backLabel={t('overview.allTrips')}
        title={trip.title}
        subtitle={
          <>
            {t('common.inviteCode')}: <span className="font-mono">{trip.inviteCode}</span> —{' '}
            {t('common.createdBy')} {owner?.name ?? t('common.unknown')}
          </>
        }
        withBorder
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8 lg:h-[calc(100vh-14rem)] lg:overflow-hidden">
        <div className="space-y-6 lg:col-span-2 lg:h-full lg:flex lg:flex-col lg:overflow-hidden">
          <h3 className="text-foreground font-headline text-lg font-bold shrink-0">
            {t('overview.tripOverview')}
          </h3>
          <div className="shrink-0">
            <TripOverviewCard trip={trip} />
          </div>
          <TripPlacesSummaryCard trip={trip} className="lg:flex-1 lg:overflow-hidden" />
        </div>
        <div className="space-y-6 lg:h-full lg:flex lg:flex-col lg:overflow-hidden">
          <h3 className="text-foreground font-headline text-lg font-bold shrink-0">
            {t('overview.boardCollaborators')}
          </h3>
          <div className="lg:flex-1 lg:overflow-y-auto pr-1 -mr-1 scrollbar-none">
            <CollaboratorsPanel members={trip.members} currentUserId={user?.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
