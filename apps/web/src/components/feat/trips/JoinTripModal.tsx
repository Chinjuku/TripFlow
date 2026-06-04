import { useState, type FormEvent } from 'react';
import { ArrowRight, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@trip-flow/ui/components/button';
import { Modal } from '@trip-flow/ui/components/modal';
import { ModalHeader } from '@trip-flow/ui/components/modal-header';
import { joinTrip } from '@/components/feat/trips';
import { OtpInput } from './OtpInput';

const CODE_LENGTH = 6;

interface JoinTripModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoined: () => void;
}

export function JoinTripModal({ open, onOpenChange, onJoined }: JoinTripModalProps) {
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  function reset() {
    setCode('');
    setError(null);
    setSubmitting(false);
  }

  function handleClose() {
    reset();
    onOpenChange(false);
  }

  async function submit() {
    if (code.length !== CODE_LENGTH) {
      setError(t('trips.enterFullCode'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await joinTrip(code);
      reset();
      onJoined();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('trips.failedJoin'));
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
      title={t('trips.joinTrip')}
      hideHeader
      dismissable={false}
    >
      <ModalHeader
        icon={UserPlus}
        tone="tertiary"
        title={t('trips.joinTrip')}
        subtitle={t('trips.joinTripDesc', { count: CODE_LENGTH })}
        onClose={handleClose}
      />

      <form
        onSubmit={handleSubmit}
        className="space-y-5 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-1 sm:px-6 sm:pb-6"
      >
        <div className="space-y-1.5">
          <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
            {t('trips.inviteCode')}
          </span>
          <OtpInput
            length={CODE_LENGTH}
            value={code}
            onChange={setCode}
            onComplete={() => void submit()}
            autoFocus
            disabled={submitting}
          />
        </div>

        {error && (
          <p className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">{error}</p>
        )}

        <Button
          type="submit"
          disabled={submitting || code.length !== CODE_LENGTH}
          className="h-12 w-full gap-2"
        >
          {!submitting && <ArrowRight className="h-5 w-5" strokeWidth={2} />}
          {submitting ? t('trips.joining') : t('trips.joinTrip')}
        </Button>

        {/* Help hint - kept from the previous design. */}
        <p className="text-muted-foreground text-center text-sm">
          {t('trips.dontHaveCode')}{' '}
          <span className="text-foreground font-medium">{t('trips.askFriend')}</span>
        </p>
      </form>
    </Modal>
  );
}
