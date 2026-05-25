import { useState, type FormEvent } from 'react';
import { Plane, PlusCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@trip-flow/ui/components/button';
import { Input } from '@trip-flow/ui/components/input';
import { Label } from '@trip-flow/ui/components/label';
import { DatePicker } from '@trip-flow/ui/components/date-picker';
import { Modal } from '@trip-flow/ui/components/modal';
import { createTrip } from '@/components/feat/trips';

interface CreateTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function CreateTripDialog({ open, onOpenChange, onCreated }: CreateTripDialogProps) {
  const [title, setTitle] = useState('');
  const [tripMode, setTripMode] = useState<'multi' | 'single'>('multi');
  const [startsOn, setStartsOn] = useState<Date | undefined>(undefined);
  const [endsOn, setEndsOn] = useState<Date | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  const duration =
    startsOn && endsOn && endsOn >= startsOn
      ? Math.round((endsOn.getTime() - startsOn.getTime()) / DAY_MS) + 1
      : null;

  function reset() {
    setTitle('');
    setTripMode('multi');
    setStartsOn(undefined);
    setEndsOn(undefined);
    setError(null);
    setSubmitting(false);
  }

  function handleStartChange(date: Date | undefined) {
    setStartsOn(date);
    if (tripMode === 'single') {
      setEndsOn(date);
    } else if (date && endsOn && endsOn < date) {
      setEndsOn(undefined);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !startsOn || !endsOn) {
      setError(t('trips.fillAllFields'));
      return;
    }
    if (endsOn < startsOn) {
      setError(t('trips.endBeforeStart'));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createTrip({
        title: title.trim(),
        startsOn: startsOn.toISOString(),
        endsOn: endsOn.toISOString(),
      });
      reset();
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('trips.failedCreate'));
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      title={t('trips.createGroupTrip')}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="trip-title">{t('trips.tripName')}</Label>
          <div className="relative">
            <Plane
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

        {/* Trip Mode Toggle (Multi-day vs One-day) */}
        <div className="space-y-2">
          <Label>{t('trips.tripType', 'ประเภททริป')}</Label>
          <div className="flex bg-muted rounded-xl p-1 border border-border/40 gap-1 w-full">
            <button
              type="button"
              onClick={() => {
                setTripMode('multi');
                setEndsOn(undefined);
              }}
              className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
                tripMode === 'multi'
                  ? 'bg-background shadow-sm text-primary font-extrabold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('trips.multiDayTrip', 'หลายวัน')}
            </button>
            <button
              type="button"
              onClick={() => {
                setTripMode('single');
                if (startsOn) {
                  setEndsOn(startsOn);
                }
              }}
              className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
                tripMode === 'single'
                  ? 'bg-background shadow-sm text-primary font-extrabold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('trips.oneDayTrip', 'วันเดียว')}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('trips.dates')}</Label>
          <div className={`grid gap-3 ${tripMode === 'multi' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
            <DatePicker
              id="trip-start"
              value={startsOn}
              onChange={handleStartChange}
              placeholder={tripMode === 'single' ? t('trips.tripDate', 'วันที่เดินทาง') : t('trips.departure')}
            />
            {tripMode === 'multi' && (
              <DatePicker
                id="trip-end"
                value={endsOn}
                onChange={setEndsOn}
                minDate={startsOn ?? undefined}
                placeholder={t('trips.return')}
              />
            )}
          </div>
        </div>

        <div className="bg-muted/40 border-border rounded-xl border p-4">
          <p className="text-muted-foreground text-xs font-medium">
            {t('trips.calculatedDuration')}
          </p>
          <p className="text-foreground mt-1 text-base font-semibold">
            {duration !== null ? t('common.days', { count: duration }) : t('trips.daysPlaceholder')}
          </p>
        </div>

        {error && (
          <p className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">{error}</p>
        )}

        <Button type="submit" disabled={submitting} className="h-12 w-full gap-2">
          {!submitting && <PlusCircle className="h-5 w-5" strokeWidth={2} />}
          {submitting ? t('trips.creating') : t('trips.createTrip')}
        </Button>
      </form>
    </Modal>
  );
}
