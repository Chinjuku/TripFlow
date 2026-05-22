import { useState, type FormEvent } from 'react';
import { ArrowRight, UserPlus } from 'lucide-react';
import { Button } from '@trip-flow/ui/components/button';
import { Modal } from '@trip-flow/ui/components/modal';
import { joinTrip } from '@/features/trips';
import { OtpInput } from './OtpInput';

const CODE_LENGTH = 6;

interface JoinTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoined: () => void;
}

export function JoinTripDialog({ open, onOpenChange, onJoined }: JoinTripDialogProps) {
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setCode('');
    setError(null);
    setSubmitting(false);
  }

  async function submit() {
    if (code.length !== CODE_LENGTH) {
      setError('Enter the full invite code');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await joinTrip(code);
      reset();
      onJoined();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join trip');
      setSubmitting(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void submit();
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      title="Join a Trip"
      hideHeader
      className="overflow-hidden"
    >
      <form onSubmit={handleSubmit} className="flex flex-col">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 px-5 pb-5 pt-2 text-center sm:px-6 sm:pb-6">
          <div className="bg-tertiary text-tertiary-foreground flex h-12 w-12 items-center justify-center rounded-full">
            <UserPlus className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <h2 className="font-headline text-foreground text-lg font-bold sm:text-xl">
            Join a Trip
          </h2>
          <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
            Enter the {CODE_LENGTH}-character invite code provided by your group organizer.
          </p>
        </div>

        <div className="border-border border-t" />

        {/* Code slots */}
        <div className="px-5 py-5 sm:px-6 sm:py-6">
          <OtpInput
            length={CODE_LENGTH}
            value={code}
            onChange={setCode}
            onComplete={() => void submit()}
            autoFocus
            disabled={submitting}
          />

          {error && (
            <p className="bg-destructive/10 text-destructive mt-4 rounded-md p-3 text-sm">
              {error}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2 px-5 pb-5 sm:px-6 sm:pb-6">
          <Button type="submit" disabled={submitting || code.length !== CODE_LENGTH} className="h-11 w-full gap-2">
            {submitting ? 'Joining…' : 'Join Trip'}
            {!submitting && <ArrowRight className="h-4 w-4" strokeWidth={2} />}
          </Button>
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="bg-tertiary text-tertiary-foreground hover:bg-tertiary/80 h-11 w-full"
          >
            Cancel
          </Button>
        </div>

        {/* Footer */}
        <div className="bg-muted/50 border-border text-muted-foreground border-t px-5 py-4 text-center text-sm sm:px-6">
          Don't have a code?{' '}
          <span className="text-foreground font-medium">Ask the friend who set up the trip.</span>
        </div>
      </form>
    </Modal>
  );
}
