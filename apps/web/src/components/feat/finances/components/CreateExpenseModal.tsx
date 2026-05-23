import { Modal } from '@trip-flow/ui/components/modal';
import { CreateExpenseForm } from './CreateExpenseForm';

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
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Record & Split"
      description="Add a new expense and choose how to distribute the cost."
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
