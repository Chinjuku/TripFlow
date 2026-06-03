import { useState, type FormEvent } from 'react';
import { CalendarRange, Car, Clock, MapPin, PlusCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@trip-flow/ui/components/button';
import { Input } from '@trip-flow/ui/components/input';
import { Label } from '@trip-flow/ui/components/label';
import { DateRangePicker, type DateRange } from '@trip-flow/ui/components/date-range-picker';
import { Modal } from '@trip-flow/ui/components/modal';
import { createTrip } from '@/components/feat/trips';
import { DestinationPicker, type DestinationValue } from './DestinationPicker';

interface CreateTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const EMPTY_RANGE: DateRange = { from: undefined, to: undefined };

/** "12 Jun – 15 Jun 2026" (locale-aware), or a single date when from === to. */
function formatRange(from: Date, to: Date): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  if (from.getTime() === to.getTime()) return from.toLocaleDateString(undefined, opts);
  const sameYear = from.getFullYear() === to.getFullYear();
  const fromStr = from.toLocaleDateString(undefined, sameYear ? { day: 'numeric', month: 'short' } : opts);
  return `${fromStr} – ${to.toLocaleDateString(undefined, opts)}`;
}

export function CreateTripDialog({ open, onOpenChange, onCreated }: CreateTripDialogProps) {
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState<DestinationValue | null>(null);
  const [range, setRange] = useState<DateRange>(EMPTY_RANGE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  // Trip length is derived from the chosen range — no separate "type" toggle.
  // A range collapsing to a single day (from === to, or only `from` picked) is
  // simply a one-day trip.
  const duration =
    range.from && range.to && range.to >= range.from
      ? Math.round((range.to.getTime() - range.from.getTime()) / DAY_MS) + 1
      : range.from
        ? 1
        : null;

  function reset() {
    setTitle('');
    setDestination(null);
    setRange(EMPTY_RANGE);
    setError(null);
    setSubmitting(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !range.from) {
      setError(t('trips.fillAllFields'));
      return;
    }
    if (!destination?.name.trim()) {
      setError(t('trips.destinationRequired'));
      return;
    }

    // A range with only `from` picked is a single-day trip.
    const startsOn = range.from;
    const endsOn = range.to ?? range.from;

    setSubmitting(true);
    setError(null);
    try {
      const hasCoords =
        destination && Number.isFinite(destination.lat) && Number.isFinite(destination.lng);
      await createTrip({
        title: title.trim(),
        startsOn: startsOn.toISOString(),
        endsOn: endsOn.toISOString(),
        destinationName: destination?.name ?? null,
        destinationNameEn: destination?.nameEn ?? null,
        centerLat: hasCoords ? destination.lat : null,
        centerLng: hasCoords ? destination.lng : null,
      });
      reset();
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('trips.failedCreate'));
      setSubmitting(false);
    }
  }

  function handleClose() {
    reset();
    onOpenChange(false);
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      title={t('trips.createGroupTrip')}
      hideHeader
      dismissable={false}
    >
      {/* Custom header — icon tile + title/subtitle, with its own close
          button since hideHeader drops the default chrome. Same surface as the
          rest of the modal (bg-card) so it doesn't read as a separate band. */}
      <div className="relative px-5 pb-4 pt-5 sm:px-6">
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          className="text-muted-foreground hover:bg-muted hover:text-foreground absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors sm:right-5"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
        <div className="flex items-center gap-3.5">
          <div className="bg-primary text-primary-foreground flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm">
            <Car className="h-5 w-5" strokeWidth={2} />
          </div>
          <div className="space-y-0.5">
            <h2 className="font-headline text-foreground text-lg font-bold sm:text-xl">
              {t('trips.createGroupTrip')}
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm">
              {t('trips.createGroupTripSubtitle')}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-1 sm:px-6 sm:pb-6">
        <div className="space-y-1.5">
          <Label htmlFor="trip-title" className="text-xs font-semibold uppercase tracking-wide">
            {t('trips.tripName')}
          </Label>
          <div className="relative">
            <Car
              className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              strokeWidth={1.75}
            />
            <Input
              id="trip-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('trips.tripNamePlaceholder')}
              autoFocus
              maxLength={120}
              required
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="trip-destination"
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide"
          >
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

        {/* Date range — pick start + end on one calendar. Same day = one-day
            trip; the type is derived, not chosen. */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
            <CalendarRange className="h-3.5 w-3.5" strokeWidth={2} />
            {t('trips.dates')}
          </Label>
          <DateRangePicker
            id="trip-dates"
            value={range}
            onChange={setRange}
            placeholder={t('trips.datesPlaceholder')}
          />
        </div>

        {/* Duration summary — hero number with the picked range underneath,
            accented once a start date exists. */}
        <div
          className={`flex items-center gap-4 rounded-2xl border p-4 transition-colors ${
            duration !== null
              ? 'border-primary/30 from-primary/10 bg-gradient-to-br to-transparent'
              : 'border-border bg-muted/40'
          }`}
        >
          {/* Hero number tile. */}
          <div
            className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl leading-none ${
              duration !== null
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {duration !== null ? (
              <>
                <span className="text-xl font-extrabold tabular-nums">{duration}</span>
                <span className="mt-0.5 text-[0.6rem] font-semibold uppercase tracking-wide opacity-90">
                  {t('common.dayUnit', { count: duration })}
                </span>
              </>
            ) : (
              <Clock className="h-5 w-5" strokeWidth={2} />
            )}
          </div>

          <div className="min-w-0">
            <p className="text-muted-foreground text-[0.7rem] font-medium uppercase tracking-wide">
              {t('trips.calculatedDuration')}
            </p>
            {duration !== null && range.from ? (
              <p className="text-foreground truncate text-sm font-semibold">
                {formatRange(range.from, range.to ?? range.from)}
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">{t('trips.datesPlaceholder')}</p>
            )}
          </div>
        </div>

        {error && (
          <p className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">{error}</p>
        )}

        <Button type="submit" disabled={submitting} className="h-12 w-full gap-2">
          {!submitting && <PlusCircle className="h-5 w-5" strokeWidth={2} />}
          {submitting ? t('trips.creating') : t('trips.createTrip')}
        </Button>
      </form>
    </Modal>
  );
}
