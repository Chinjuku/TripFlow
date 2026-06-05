import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/shared/navigation/PageHeader';
import { useTrip } from '@/components/feat/tripList';
import {
  EditTripSection,
  MembersSection,
  DangerSection,
  TripSettingsTabs,
  type TripSettingsTab,
} from '@/components/feat/tripSettings';

export default function TripSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: trip, isLoading, refresh } = useTrip(id);

  const tab: TripSettingsTab = searchParams.get('tab') === 'members' ? 'members' : 'details';
  function setTab(next: TripSettingsTab) {
    const params = new URLSearchParams(searchParams);
    if (next === 'details') params.delete('tab');
    else params.set('tab', next);
    setSearchParams(params, { replace: true });
  }

  if (!id) return null;
  if (isLoading && !trip) return null;
  if (trip && trip.role !== 'owner') {
    return <Navigate to={`/trips/${id}`} replace />;
  }
  if (!trip) return null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        backTo={`/trips/${id}`}
        backLabel={t('overview.tripOverview', 'Trip overview')}
        title={t('nav.tripSettings')}
        subtitle={t('trips.settings.subtitle')}
      />

      <TripSettingsTabs active={tab} onChange={setTab} />

      {tab === 'details' ? (
        <>
          <EditTripSection tripId={id} trip={trip} onSaved={() => void refresh()} />
          <DangerSection tripId={id} title={trip.title} onDeleted={() => navigate('/trips')} />
        </>
      ) : (
        <MembersSection
          tripId={id}
          members={trip.members}
          ownerId={trip.ownerId}
          onChanged={() => void refresh()}
        />
      )}
    </div>
  );
}
