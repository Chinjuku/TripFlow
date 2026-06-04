import { ScrollText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@trip-flow/ui/components/modal';
import { ModalHeader } from '@trip-flow/ui/components/modal-header';
import { TERMS_SECTIONS } from '@/utils/auth';

interface TermsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Read-only Terms of Service shown from the sign-in panel's terms notice. */
export function TermsModal({ open, onOpenChange }: TermsModalProps) {
  const { t } = useTranslation();

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={t('auth.terms.title')} hideHeader>
      <ModalHeader
        icon={ScrollText}
        title={t('auth.terms.title')}
        subtitle={t('auth.terms.description')}
        onClose={() => onOpenChange(false)}
      />

      <div className="space-y-5 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-1 sm:px-6 sm:pb-6">
        <p className="text-muted-foreground text-sm leading-relaxed">{t('auth.terms.intro')}</p>

        <div className="space-y-4">
          {TERMS_SECTIONS.map(({ titleKey, bodyKey }) => (
            <section key={titleKey} className="space-y-1">
              <h3 className="text-foreground text-sm font-semibold">{t(titleKey)}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{t(bodyKey)}</p>
            </section>
          ))}
        </div>
      </div>
    </Modal>
  );
}
