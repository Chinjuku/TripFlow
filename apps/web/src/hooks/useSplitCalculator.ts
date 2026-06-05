import { useEffect, useRef } from 'react';
import type { UseFormSetValue, UseFormWatch } from 'react-hook-form';
import type { ExpenseFormValues } from '@/components/feat/finances/expenses/expense-form-schema';

interface UseSplitCalculatorArgs {
  watch: UseFormWatch<ExpenseFormValues>;
  setValue: UseFormSetValue<ExpenseFormValues>;
}

interface SplitCalculation {
  /** Index of the payer within the splits array, or -1 if not found. */
  exactPayerIndex: number;
  /** Auto-derived remainder owed by the payer in exact-amount mode. */
  calculatedPayerAmount: number;
  /** Running total of all split amounts (payer included) in exact-amount mode. */
  exactSplitSum: number;
  /** True when the exact splits don't add up to the total (beyond rounding). */
  isExactMismatch: boolean;
}

/**
 * Owns the dynamic split math for the create-expense form:
 * - in `equally` mode, distributes the amount evenly across checked members
 *   (rounding remainder lands on the first checked member);
 * - in `exact_amount` mode, keeps the payer included, defaults their itemPaid
 *   to the merchant description, and derives their amount as the remainder.
 *
 * Returns the render-time figures the form needs for display and validation.
 */
export function useSplitCalculator({ watch, setValue }: UseSplitCalculatorArgs): SplitCalculation {
  const watchAmount = watch('amount') || 0;
  const watchSplitMethod = watch('splitMethod');
  const watchSplits = watch('splits') || [];
  const watchDescription = watch('description') || '';
  const watchPaidById = watch('paidById');

  const checkedCount = watchSplits.filter((s) => s.checked).length;
  const lastDescriptionRef = useRef(watchDescription);

  // Auto-recalculate splits in 'equally' mode when amount or checked items change
  useEffect(() => {
    if (watchSplitMethod === 'equally') {
      const equalShare = checkedCount > 0 ? Number((watchAmount / checkedCount).toFixed(2)) : 0;

      // Distribute remainder (due to rounding) to the first checked member
      let remainder = 0;
      if (checkedCount > 0) {
        remainder = Number((watchAmount - equalShare * checkedCount).toFixed(2));
      }

      let distributedFirst = false;

      watchSplits.forEach((split, index) => {
        if (split.checked) {
          let finalAmount = equalShare;
          if (!distributedFirst) {
            finalAmount = Number((equalShare + remainder).toFixed(2));
            distributedFirst = true;
          }
          setValue(`splits.${index}.amount`, finalAmount);
        } else {
          setValue(`splits.${index}.amount`, 0);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchAmount, watchSplitMethod, checkedCount, setValue]);

  // Auto-calculate exact split for the payer (paidById) and default itemPaid to merchant description
  useEffect(() => {
    if (watchSplitMethod === 'exact_amount') {
      const payerIndex = watchSplits.findIndex((s) => s.userId === watchPaidById);
      if (payerIndex !== -1) {
        // Ensure the payer is checked/included by default in exact split
        if (!watchSplits[payerIndex]?.checked) {
          setValue(`splits.${payerIndex}.checked`, true);
        }

        // Default itemPaid to merchant description for the payer when it's empty
        // or still mirrors the previous description.
        if (
          watchDescription &&
          (!watchSplits[payerIndex]?.itemPaid ||
            watchSplits[payerIndex]?.itemPaid === lastDescriptionRef.current)
        ) {
          setValue(`splits.${payerIndex}.itemPaid`, watchDescription);
        }
      }
    }
    lastDescriptionRef.current = watchDescription;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchSplitMethod, watchPaidById, watchDescription, setValue, watchSplits]);

  // --- Render-time calculations for Exact Amount Split ---
  const exactPayerIndex = watchSplits.findIndex((s) => s.userId === watchPaidById);
  const exactOtherSplitsSum = watchSplits.reduce((sum, s, idx) => {
    if (idx !== exactPayerIndex && s.checked) {
      return sum + (Number(s.amount) || 0);
    }
    return sum;
  }, 0);
  const calculatedPayerAmount = Number(Math.max(0, watchAmount - exactOtherSplitsSum).toFixed(2));

  // Validation: sum of exact split amounts must match the total expense amount
  const exactSplitSum = watchSplits.reduce((sum, s, idx) => {
    if (watchSplitMethod === 'exact_amount' && idx === exactPayerIndex) {
      return sum + calculatedPayerAmount;
    }
    return sum + (s.checked ? Number(s.amount) || 0 : 0);
  }, 0);
  const isExactMismatch =
    watchSplitMethod === 'exact_amount' && Math.abs(exactSplitSum - watchAmount) > 0.05;

  return { exactPayerIndex, calculatedPayerAmount, exactSplitSum, isExactMismatch };
}
