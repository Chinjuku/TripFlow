import { useState, type FormEvent } from 'react';
import { Plane, PlusCircle } from 'lucide-react';
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
  const [startsOn, setStartsOn] = useState<Date | undefined>(undefined);
  const [endsOn, setEndsOn] = useState<Date | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const duration =
    startsOn && endsOn && endsOn >= startsOn
      ? Math.round((endsOn.getTime() - startsOn.getTime()) / DAY_MS) + 1
      : null;

  function reset() {
    setTitle('');
    setStartsOn(undefined);
    setEndsOn(undefined);
    setError(null);
    setSubmitting(false);
  }

  function handleStartChange(date: Date | undefined) {
    setStartsOn(date);
    if (date && endsOn && endsOn < date) {
      setEndsOn(undefined);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !startsOn || !endsOn) {
      setError('Please fill in every field');
      return;
    }
    if (endsOn < startsOn) {
      setError('End date cannot be before the start date');
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
      setError(err instanceof Error ? err.message : 'Failed to create trip');
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
      title="Create Group Trip"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="trip-title">Trip Name</Label>
          <div className="relative">
            <Plane
              className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              strokeWidth={1.75}
            />
            <Input
              id="trip-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Summer Alps Retreat"
              autoFocus
              maxLength={120}
              required
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Dates</Label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DatePicker
              id="trip-start"
              value={startsOn}
              onChange={handleStartChange}
              placeholder="Departure"
            />
            <DatePicker
              id="trip-end"
              value={endsOn}
              onChange={setEndsOn}
              minDate={startsOn ?? undefined}
              placeholder="Return"
            />
          </div>
        </div>

        <div className="bg-muted/40 border-border rounded-xl border p-4">
          <p className="text-muted-foreground text-xs font-medium">Calculated Duration</p>
          <p className="text-foreground mt-1 text-base font-semibold">
            {duration !== null ? `${duration} day${duration === 1 ? '' : 's'}` : '— days'}
          </p>
        </div>

        {error && (
          <p className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">{error}</p>
        )}

        <Button type="submit" disabled={submitting} className="h-12 w-full gap-2">
          {!submitting && <PlusCircle className="h-5 w-5" strokeWidth={2} />}
          {submitting ? 'Creating…' : 'Create Trip'}
        </Button>
      </form>
    </Modal>
  );
}
