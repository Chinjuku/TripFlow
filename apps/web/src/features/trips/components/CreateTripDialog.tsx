import { useState, type FormEvent } from 'react';
import { Button } from '@trip-flow/ui/components/button';
import { Input } from '@trip-flow/ui/components/input';
import { Label } from '@trip-flow/ui/components/label';
import { DatePicker } from '@trip-flow/ui/components/date-picker';
import { Modal } from '@trip-flow/ui/components/modal';
import { createTrip } from '@/features/trips';

interface CreateTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateTripDialog({ open, onOpenChange, onCreated }: CreateTripDialogProps) {
  const [title, setTitle] = useState('');
  const [startsOn, setStartsOn] = useState<Date | undefined>(undefined);
  const [endsOn, setEndsOn] = useState<Date | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setTitle('');
    setStartsOn(undefined);
    setEndsOn(undefined);
    setError(null);
    setSubmitting(false);
  }

  function handleStartChange(date: Date | undefined) {
    setStartsOn(date);
    // Clear end if it's now before the new start.
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
      title="New trip"
      description="Set up a workspace your group can plan together."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="trip-title">Title</Label>
          <Input
            id="trip-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Bangkok long weekend"
            autoFocus
            maxLength={120}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="trip-start">Start date</Label>
            <DatePicker
              id="trip-start"
              value={startsOn}
              onChange={handleStartChange}
              placeholder="Select start"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="trip-end">End date</Label>
            <DatePicker
              id="trip-end"
              value={endsOn}
              onChange={setEndsOn}
              minDate={startsOn ?? undefined}
              placeholder="Select end"
            />
          </div>
        </div>

        {error && (
          <p className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">{error}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create trip'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
