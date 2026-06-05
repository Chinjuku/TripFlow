import { Modal } from '@/components/ui/modal';
import { CreateExpenseForm } from './CreateExpenseForm';
import { useTranslation } from 'react-i18next';

interface CreateExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: { userId: string; name: string; avatarUrl: string | null }[];
  currentUserId: string;
  onSubmit: (values: any) => Promise<void>;
  isSubmitting: boolean;
}

export function CreateExpenseModal({
  open,
  onOpenChange,
  members,
  currentUserId,
  onSubmit,
  isSubmitting,
}: CreateExpenseModalProps) {
  const { t } = useTranslation();
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t('finances.recordAndSplit')}
      description={t('finances.recordAndSplitDesc')}
      hideHeader
      className="sm:max-w-2xl"
    >
      <CreateExpenseForm
        members={members}
        currentUserId={currentUserId}
        onSubmit={async (values) => {
          await onSubmit(values);
          onOpenChange(false);
        }}
        onCancel={() => onOpenChange(false)}
        isSubmitting={isSubmitting}
      />
    </Modal>
  );
}
