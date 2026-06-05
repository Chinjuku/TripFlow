import { useState } from 'react';
import { UserPlus, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { ModalHeader } from '@/components/ui/modal-header';
import { cn } from '@/lib/cn';

interface InviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip:
    | {
        title: string;
        inviteCode: string;
      }
    | null
    | undefined;
}

export function InviteModal({ open, onOpenChange, trip }: InviteModalProps) {
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation();

  if (!trip) return null;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(trip.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t('overview.inviteFriends')}
      hideHeader
      dismissable={false}
    >
      <ModalHeader
        icon={UserPlus}
        tone="tertiary"
        title={t('overview.inviteFriends')}
        subtitle={t('overview.inviteDesc', { title: trip.title })}
        onClose={() => onOpenChange(false)}
      />

      <div className="space-y-5 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-1 sm:px-6 sm:pb-6">
        {/* Invite code */}
        <div className="space-y-1.5">
          <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
            {t('common.inviteCode')}
          </span>
          <div className="bg-muted border-border flex items-center justify-between gap-4 rounded-xl border px-4 py-3">
            <span
              className={cn(
                'select-all font-mono text-2xl font-black tracking-widest transition-colors',
                copied ? 'text-foreground' : 'text-muted-foreground/50',
              )}
            >
              {copied ? trip.inviteCode : '••••••'}
            </span>
            <Button
              onClick={handleCopyCode}
              variant={copied ? 'default' : 'outline'}
              size="sm"
              className={cn(
                'h-10 min-w-[5.5rem] gap-2 rounded-xl font-semibold transition-all',
                copied && 'bg-emerald-600 hover:bg-emerald-600',
              )}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  {t('common.copied')}
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  {t('common.copy')}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* How-to steps */}
        <div className="bg-muted/40 border-border space-y-2 rounded-xl border p-4">
          <h4 className="text-foreground text-sm font-semibold">{t('overview.howToUseCode')}</h4>
          <ol className="text-muted-foreground list-inside list-decimal space-y-1.5 text-xs leading-relaxed">
            <li>{t('overview.howToStep1')}</li>
            <li>{t('overview.howToStep2')}</li>
            <li>{t('overview.howToStep3')}</li>
          </ol>
        </div>

        <Button
          type="button"
          onClick={() => onOpenChange(false)}
          className="h-12 w-full rounded-xl font-semibold"
        >
          {t('common.done')}
        </Button>
      </div>
    </Modal>
  );
}
