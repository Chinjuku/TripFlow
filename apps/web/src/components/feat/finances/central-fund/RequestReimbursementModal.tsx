import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Banknote, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface RequestReimbursementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remainingCentralFund: number;
  onSubmit: (amount: number) => Promise<void>;
  isSubmitting: boolean;
}

export function RequestReimbursementModal({
  open,
  onOpenChange,
  remainingCentralFund,
  onSubmit,
  isSubmitting,
}: RequestReimbursementModalProps) {
  const { t } = useTranslation();

  const schema = z.object({
    amount: z
      .number()
      .min(0.01)
      .max(
        remainingCentralFund,
        `Cannot exceed remaining central fund (฿${remainingCentralFund.toLocaleString()})`,
      ),
  });

  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { amount: 0 },
  });

  const handleFormSubmit = async (data: FormValues) => {
    await onSubmit(data.amount);
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t('finances.centralFund.requestReimbursement', 'Request Reimbursement')}
      description={t(
        'finances.centralFund.requestReimbursementDesc',
        'Request money back from the central fund for expenses you paid.',
      )}
      className="sm:max-w-sm"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 pt-4">
        <div className="space-y-1.5">
          <Label htmlFor="amount" className="text-xs font-bold text-muted-foreground">
            {t('finances.amountThbLabel', 'Amount (THB)')}
          </Label>
          <div className="relative flex items-center">
            <Input
              id="amount"
              type="number"
              step="0.01"
              className={`pl-12 h-14 border-input bg-background rounded-xl focus-visible:ring-primary text-2xl font-bold ${
                errors.amount ? 'border-destructive' : ''
              }`}
              {...register('amount', { valueAsNumber: true })}
            />
            <div className="absolute left-4 flex items-center text-muted-foreground gap-1.5">
              <Banknote className="w-5 h-5 text-primary" />
            </div>
          </div>
          {errors.amount && (
            <p className="text-destructive text-[11px] mt-0.5">{errors.amount.message}</p>
          )}
        </div>

        <div className="bg-primary/5 p-3 rounded-xl border border-primary/10">
          <p className="text-xs text-muted-foreground text-center">
            {t('finances.centralFund.remainingLabel', 'Remaining Central Fund:')}{' '}
            <span className="font-bold text-foreground ml-1">
              ฿{remainingCentralFund.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </p>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-sm transition-all"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            t('common.confirm', 'Confirm')
          )}
        </Button>
      </form>
    </Modal>
  );
}
