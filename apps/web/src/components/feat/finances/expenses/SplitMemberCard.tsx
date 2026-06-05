import { X } from 'lucide-react';
import type { UseFormRegister } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar } from '@/components/ui/avatar';
import { useTranslation } from 'react-i18next';
import type { ExpenseFormValues, ExpenseFormMember } from './expense-form-schema';

interface SplitMemberCardProps {
  index: number;
  userId: string;
  member: ExpenseFormMember | undefined;
  splitAmount: number;
  splitMethod: ExpenseFormValues['splitMethod'];
  currentUserId: string;
  paidById: string;
  /** Auto-derived remainder shown (read-only) for the payer in exact-amount mode. */
  calculatedPayerAmount: number;
  register: UseFormRegister<ExpenseFormValues>;
  onExclude: (index: number) => void;
}

/**
 * One traveler row inside the split breakdown. Shows the equal share, or — in
 * exact-amount mode — item/amount inputs (the payer's amount is auto-filled and
 * read-only). The exclude button is hidden for the current user and the payer.
 */
export function SplitMemberCard({
  index,
  userId,
  member,
  splitAmount,
  splitMethod,
  currentUserId,
  paidById,
  calculatedPayerAmount,
  register,
  onExclude,
}: SplitMemberCardProps) {
  const { t } = useTranslation();
  const isPayer = userId === paidById;

  return (
    <div className="group relative border border-border bg-card p-4 rounded-2xl shadow-sm transition-all duration-200 hover:shadow-md animate-slide-down">
      {/* Close button X (excludes traveler) - hidden for current user and payer */}
      {userId !== currentUserId && !isPayer && (
        <button
          type="button"
          onClick={() => onExclude(index)}
          className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 duration-150"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      <div className="flex items-center justify-between gap-3">
        {/* User profile & Name */}
        <div className="flex items-center gap-3">
          <Avatar
            name={member?.name || ''}
            src={member?.avatarUrl}
            className="text-xs shadow-sm ring-1 ring-border"
          />
          <div>
            <span className="text-foreground text-sm font-semibold leading-none block">
              {member?.userId === currentUserId
                ? `${member?.name} (${t('common.you')})`
                : member?.name}
            </span>
          </div>
        </div>

        {/* Amount display for Equal share */}
        {splitMethod === 'equally' && (
          <span className="text-primary text-base font-extrabold min-w-[5rem] text-right">
            ฿{splitAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        )}
      </div>

      {/* Inputs display for Exact split */}
      {splitMethod === 'exact_amount' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 border-t border-border/40 pt-3 animate-slide-down">
          <div className="space-y-1">
            <Label
              htmlFor={`splits.${index}.itemPaid`}
              className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center h-4"
            >
              {t('finances.itemPaidLabel')}
            </Label>
            <Input
              id={`splits.${index}.itemPaid`}
              type="text"
              placeholder={t('finances.itemPaidPlaceholder', 'Menu/item (e.g. Pad Thai)')}
              className="h-9 text-xs border-input rounded-xl focus-visible:ring-primary bg-muted/30"
              {...register(`splits.${index}.itemPaid`)}
            />
          </div>

          <div className="space-y-1">
            <Label
              htmlFor={`splits.${index}.amount`}
              className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between h-4"
            >
              <span>{t('finances.amountThbLabel')}</span>
              {isPayer && (
                <span className="text-[9px] text-primary font-extrabold normal-case leading-none">
                  ({t('finances.autoPayerRemainder')})
                </span>
              )}
            </Label>
            <div className="relative">
              <Input
                id={`splits.${index}.amount`}
                type="number"
                step="0.01"
                placeholder="0.00"
                readOnly={isPayer}
                value={isPayer ? calculatedPayerAmount : undefined}
                className={`h-9 pl-6 pr-2 text-xs font-bold border-input rounded-xl focus-visible:ring-primary text-right ${
                  isPayer
                    ? 'bg-muted text-muted-foreground cursor-not-allowed select-none'
                    : 'text-foreground'
                }`}
                {...(isPayer ? {} : register(`splits.${index}.amount`, { valueAsNumber: true }))}
              />
              <span className="absolute left-2.5 top-2.5 text-[10px] font-bold text-muted-foreground">
                ฿
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
