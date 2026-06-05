import { useState } from 'react';
import { CalendarRange, MapPin, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DateRangePicker, type DateRange } from '@/components/ui/date-range-picker';
import { updateTrip } from '@/api/trips';
import { DestinationPicker, type DestinationValue } from '@/components/shared/form/DestinationPicker';
import { SettingsCard } from './SettingsCard';

const DAY_MS = 24 * 60 * 60 * 1000;

interface EditableTrip {
  title: string;
  startsOn: string;
  endsOn: string;
  destinationName: string | null;
  destinationNameEn: string | null;
  centerLat: number | null;
  centerLng: number | null;
  centralFundPerPerson?: number | null;
}

interface EditTripSectionProps {
  tripId: string;
  trip: EditableTrip;
  onSaved: () => void;
}

export function EditTripSection({ tripId, trip, onSaved }: EditTripSectionProps) {
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
    trip.centralFundPerPerson ?? '',
  );
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle');

  async function handleSave() {
    // Destination is required - same rule as create.
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
    range.from && range.to
      ? Math.round((range.to.getTime() - range.from.getTime()) / DAY_MS) + 1
      : 1;

  return (
    <SettingsCard>
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
          <Label
            htmlFor="central-fund-per-person"
            className="text-xs font-semibold uppercase tracking-wide"
          >
            {t('finances.centralFund.amountPerPersonLabel', 'Central Fund Target (per person)')}
          </Label>
          <Input
            id="central-fund-per-person"
            type="number"
            min="0"
            step="any"
            value={centralFundPerPerson}
            onChange={(e) =>
              setCentralFundPerPerson(e.target.value === '' ? '' : Number(e.target.value))
            }
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
    </SettingsCard>
  );
}
