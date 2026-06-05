import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { placeName } from '@/utils/schedule';
import type { ScheduleItem } from '@/types/schedule';

interface DedupeConfirmModalProps {
  rows: ScheduleItem[] | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DedupeConfirmModal({ rows, onCancel, onConfirm }: DedupeConfirmModalProps) {
  const { t, i18n } = useTranslation();
  const open = rows !== null && rows.length > 0;
  const count = rows?.length ?? 0;

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
      title={t('schedule.switchToNoRepeats')}
      description={t('schedule.dedupeDesc', { count })}
    >
      <div className="space-y-4">
        {rows && rows.length > 0 && (
          <ul className="border-border bg-muted/30 max-h-56 space-y-1.5 overflow-y-auto rounded-lg border p-3">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-foreground truncate font-medium">
                  {placeName(r.place, i18n.language)}
                </span>
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {t('schedule.day', { number: r.dayIndex + 1 })} ·{' '}
                  {String(Math.floor(r.startMinute / 60)).padStart(2, '0')}:
                  {String(r.startMinute % 60).padStart(2, '0')}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            {t('schedule.cancel')}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {t('schedule.removeDuplicates')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
