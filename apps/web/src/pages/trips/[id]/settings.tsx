import { useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CalendarRange, MapPin, Save, Trash2, UserMinus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@trip-flow/ui/components/button';
import { Input } from '@trip-flow/ui/components/input';
import { Label } from '@trip-flow/ui/components/label';
import { Modal } from '@trip-flow/ui/components/modal';
import { cn } from '@trip-flow/ui/lib/cn';
import { DateRangePicker, type DateRange } from '@trip-flow/ui/components/date-range-picker';
import { TripPageHeader } from '@/components/shared/TripPageHeader';
import {
  useTrip,
  updateTrip,
  deleteTrip,
  removeTripMember,
  getInitials,
  type TripMemberProfile,
} from '@/components/feat/trips';
import { DestinationPicker, type DestinationValue } from '@/components/feat/trips/DestinationPicker';

type SettingsTab = 'details' | 'members';

export default function TripSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: trip, isLoading, refresh } = useTrip(id);

  const tab: SettingsTab = searchParams.get('tab') === 'members' ? 'members' : 'details';
  function setTab(next: SettingsTab) {
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

  const TABS: { id: SettingsTab; label: string }[] = [
    { id: 'details', label: t('trips.settings.detailsTitle') },
    { id: 'members', label: t('trips.settings.membersTitle') },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <TripPageHeader
        backTo={`/trips/${id}`}
        backLabel={t('overview.tripOverview', 'Trip overview')}
        title={t('nav.tripSettings')}
        subtitle={t('trips.settings.subtitle')}
      />

      {/* Tabs — underline style, matching the plan page. */}
      <div className="border-border flex items-center gap-2 border-b" role="tablist">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.id}
            type="button"
            role="tab"
            aria-selected={tab === tabItem.id}
            onClick={() => setTab(tabItem.id)}
            className={cn(
              'relative -mb-px border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors sm:px-4',
              tab === tabItem.id
                ? 'border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground border-transparent',
            )}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

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

/* ------------------------------------------------------------------ */
/*  Edit details                                                       */
/* ------------------------------------------------------------------ */

function Card({ children }: { children: React.ReactNode }) {
  return <section className="bg-card border-border rounded-2xl border p-5 sm:p-6">{children}</section>;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function EditTripSection({
  tripId,
  trip,
  onSaved,
}: {
  tripId: string;
  trip: {
    title: string;
    startsOn: string;
    endsOn: string;
    destinationName: string | null;
    destinationNameEn: string | null;
    centerLat: number | null;
    centerLng: number | null;
    centralFundPerPerson?: number | null;
  };
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(trip.title);
  const [destination, setDestination] = useState<DestinationValue | null>(
    trip.destinationName && trip.centerLat != null && trip.centerLng != null
      ? {
          name: trip.destinationName,
          nameEn: trip.destinationNameEn ?? trip.destinationName,
          lat: trip.centerLat,
          lng: trip.centerLng,
        }
      : null,
  );
  const [range, setRange] = useState<DateRange>({
    from: new Date(trip.startsOn),
    to: new Date(trip.endsOn),
  });
  const [centralFundPerPerson, setCentralFundPerPerson] = useState<number | ''>(
    trip.centralFundPerPerson ?? ''
  );
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle');

  async function handleSave() {
    // Destination is required — same rule as create.
    if (!title.trim() || !range.from || !destination?.name.trim()) return;
    setSaving(true);
    setStatus('idle');
    try {
      const hasCoords =
        destination && Number.isFinite(destination.lat) && Number.isFinite(destination.lng);
      await updateTrip(tripId, {
        title: title.trim(),
        startsOn: range.from.toISOString(),
        endsOn: (range.to ?? range.from).toISOString(),
        destinationName: destination?.name ?? null,
        destinationNameEn: destination?.nameEn ?? null,
        centerLat: hasCoords ? destination!.lat : null,
        centerLng: hasCoords ? destination!.lng : null,
        centralFundPerPerson: centralFundPerPerson === '' ? null : Number(centralFundPerPerson),
      });
      setStatus('ok');
      onSaved();
      setTimeout(() => setStatus('idle'), 2500);
    } catch {
      setStatus('error');
    } finally {
      setSaving(false);
    }
  }

  const duration =
    range.from && range.to ? Math.round((range.to.getTime() - range.from.getTime()) / DAY_MS) + 1 : 1;

  return (
    <Card>
      <div className="mb-4">
        <h2 className="text-foreground text-base font-bold">{t('trips.settings.detailsTitle')}</h2>
        <p className="text-muted-foreground text-sm">{t('trips.settings.detailsDesc')}</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="trip-title" className="text-xs font-semibold uppercase tracking-wide">
            {t('trips.tripName')}
          </Label>
          <Input
            id="trip-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
            <MapPin className="h-3.5 w-3.5" strokeWidth={2} />
            {t('trips.destination')}
            <span className="text-destructive" aria-hidden>
              *
            </span>
          </Label>
          <DestinationPicker
            value={destination}
            onChange={setDestination}
            placeholder={t('trips.destinationPlaceholder')}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
            <CalendarRange className="h-3.5 w-3.5" strokeWidth={2} />
            {t('trips.dates')}
            <span className="text-muted-foreground ml-auto font-normal normal-case">
              {t('common.days', { count: duration })}
            </span>
          </Label>
          <DateRangePicker
            value={range}
            onChange={setRange}
            placeholder={t('trips.datesPlaceholder')}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="central-fund-per-person" className="text-xs font-semibold uppercase tracking-wide">
            {t('finances.centralFund.amountPerPersonLabel', 'Central Fund Target (per person)')}
          </Label>
          <Input
            id="central-fund-per-person"
            type="number"
            min="0"
            step="any"
            value={centralFundPerPerson}
            onChange={(e) => setCentralFundPerPerson(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder={t('finances.centralFund.amountDesc', 'Amount that each person should contribute')}
          />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Button
            onClick={handleSave}
            disabled={saving || !title.trim() || !range.from || !destination?.name.trim()}
            className="gap-2"
          >
            <Save className="h-4 w-4" strokeWidth={2} />
            {t('trips.settings.saveChanges')}
          </Button>
          {status === 'ok' && (
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              {t('trips.settings.saved')}
            </span>
          )}
          {status === 'error' && (
            <span className="text-destructive text-sm font-medium">
              {t('trips.settings.saveFailed')}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Members                                                            */
/* ------------------------------------------------------------------ */

function MembersSection({
  tripId,
  members,
  ownerId,
  onChanged,
}: {
  tripId: string;
  members: TripMemberProfile[];
  ownerId: string;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(member: TripMemberProfile) {
    if (!window.confirm(t('trips.settings.removeMemberConfirm', { name: member.name }))) return;
    setBusyId(member.userId);
    setError(null);
    try {
      await removeTripMember(tripId, member.userId);
      onChanged();
    } catch {
      setError(t('trips.settings.removeMemberFailed'));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <div className="mb-4">
        <h2 className="text-foreground text-base font-bold">{t('trips.settings.membersTitle')}</h2>
        <p className="text-muted-foreground text-sm">{t('trips.settings.membersDesc')}</p>
      </div>

      {error && <p className="bg-destructive/10 text-destructive mb-3 rounded-lg p-3 text-sm">{error}</p>}

      <ul className="divide-border divide-y">
        {members.map((m) => {
          const isOwner = m.userId === ownerId;
          return (
            <li key={m.userId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              {m.avatarUrl ? (
                <img
                  src={m.avatarUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="border-border h-9 w-9 shrink-0 rounded-full border object-cover"
                />
              ) : (
                <span className="bg-muted text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                  {getInitials(m.name)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-foreground truncate text-sm font-medium">{m.name}</p>
                <p className="text-muted-foreground truncate text-xs">{m.email}</p>
              </div>
              {isOwner ? (
                <span className="bg-primary/10 text-primary rounded-full px-2.5 py-1 text-xs font-semibold">
                  {t('trips.settings.owner')}
                </span>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void remove(m)}
                  disabled={busyId === m.userId}
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5"
                >
                  <UserMinus className="h-4 w-4" strokeWidth={2} />
                  {t('trips.settings.remove')}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Danger zone                                                        */
/* ------------------------------------------------------------------ */

function DangerSection({
  tripId,
  title,
  onDeleted,
}: {
  tripId: string;
  title: string;
  onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await deleteTrip(tripId);
      onDeleted();
    } catch {
      setError(t('trips.settings.deleteFailed'));
      setDeleting(false);
    }
  }

  return (
    <>
      <section className="border-destructive/30 bg-destructive/5 rounded-2xl border p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-destructive text-base font-bold">{t('trips.settings.dangerTitle')}</h2>
            <p className="text-muted-foreground text-sm">{t('trips.settings.dangerDesc')}</p>
          </div>
          <Button
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
            className="shrink-0 gap-2 self-start sm:self-auto"
          >
            <Trash2 className="h-4 w-4" strokeWidth={2} />
            {t('trips.settings.deleteTrip')}
          </Button>
        </div>
      </section>

      <Modal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('trips.settings.deleteTrip')}
      >
        <div className="space-y-5">
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t('trips.settings.deleteConfirm', { title })}
          </p>
          {error && <p className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={deleting}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="gap-2">
              <Trash2 className="h-4 w-4" strokeWidth={2} />
              {deleting ? t('trips.settings.deleting') : t('trips.settings.deleteTrip')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
