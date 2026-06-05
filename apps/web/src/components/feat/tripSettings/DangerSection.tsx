import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { deleteTrip } from '@/api/trips';

interface DangerSectionProps {
  tripId: string;
  title: string;
  onDeleted: () => void;
}

export function DangerSection({ tripId, title, onDeleted }: DangerSectionProps) {
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
            <h2 className="text-destructive text-base font-bold">
              {t('trips.settings.dangerTitle')}
            </h2>
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

      <Modal open={confirmOpen} onOpenChange={setConfirmOpen} title={t('trips.settings.deleteTrip')}>
        <div className="space-y-5">
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t('trips.settings.deleteConfirm', { title })}
          </p>
          {error && (
            <p className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">{error}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={deleting}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" strokeWidth={2} />
              {deleting ? t('trips.settings.deleting') : t('trips.settings.deleteTrip')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
