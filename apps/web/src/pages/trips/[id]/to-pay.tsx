import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import {
  TripFinancesLayout,
  useTripFinancesContext,
  SettlementHelpNote,
  CreditorCard,
  type Creditor,
} from '@/components/feat/finances';
import type { DebtRelation, HydratedExpense, HydratedSettlement } from '@/components/feat/finances';
import type { Transaction } from '@/types/finances';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { formatLocalizedDate } from '@/lib/utils';

function buildCreditorsList(
  currentUserId: string,
  whatYouOwe: DebtRelation[],
  expenses: HydratedExpense[],
  settlements: HydratedSettlement[],
  t: TFunction,
  isOptimized: boolean,
  lng: string,
): Creditor[] {
  return whatYouOwe.map((creditor) => {
    // Reconstruct contributing transactions between currentUserId and creditor.
    const positiveTxs = expenses
      .filter((exp) => exp.paid_by_id === creditor.userId)
      .map((exp) => {
        const split = exp.splits.find((s) => s.user_id === currentUserId);
        if (!split) return null;

        let displayDescription = exp.description;
        if (exp.split_method === 'exact_amount') {
          const ownerSplit = exp.splits.find((s) => s.user_id === exp.paid_by_id);
          displayDescription = split.item_paid || ownerSplit?.item_paid || exp.description;
        }

        return {
          id: `exp-${exp.id}`,
          description: displayDescription,
          date: exp.expense_date
            ? formatLocalizedDate(exp.expense_date, lng, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : t('finances.unknownDate'),
          amount: split.amount,
          category: exp.category,
        };
      })
      .filter(Boolean) as Transaction[];

    const negativeTxs = expenses
      .filter((exp) => exp.paid_by_id === currentUserId)
      .map((exp) => {
        const split = exp.splits.find((s) => s.user_id === creditor.userId);
        if (!split) return null;

        let displayDescription = exp.description;
        if (exp.split_method === 'exact_amount') {
          const ownerSplit = exp.splits.find((s) => s.user_id === exp.paid_by_id);
          displayDescription = split.item_paid || ownerSplit?.item_paid || exp.description;
        }

        return {
          id: `exp-${exp.id}`,
          description: displayDescription,
          date: exp.expense_date
            ? formatLocalizedDate(exp.expense_date, lng, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : t('finances.unknownDate'),
          amount: -split.amount,
          category: exp.category,
        };
      })
      .filter(Boolean) as Transaction[];

    const outgoingSettlements = settlements
      .filter(
        (set) =>
          set.payer_id === currentUserId &&
          set.payee_id === creditor.userId &&
          set.status === 'completed',
      )
      .map((set) => ({
        id: `set-${set.id}`,
        description: t('finances.repaymentSent'),
        date: set.created_at
          ? formatLocalizedDate(set.created_at, lng, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : t('finances.unknownDate'),
        amount: -set.amount,
        category: 'other' as const,
      }));

    const incomingSettlements = settlements
      .filter(
        (set) =>
          set.payer_id === creditor.userId &&
          set.payee_id === currentUserId &&
          set.status === 'completed',
      )
      .map((set) => ({
        id: `set-${set.id}`,
        description: t('finances.repaymentReceived'),
        date: set.created_at
          ? formatLocalizedDate(set.created_at, lng, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : t('finances.unknownDate'),
        amount: set.amount,
        category: 'other' as const,
      }));

    const allTxs = isOptimized
      ? [...positiveTxs, ...negativeTxs, ...outgoingSettlements, ...incomingSettlements]
      : [...positiveTxs, ...outgoingSettlements];

    // เช็กว่าเราเคยกด "Mark as paid" ไปแล้วและกำลังรอให้อีกฝ่ายยืนยัน (Pending) หรือไม่
    const hasPendingSettlement = settlements.some(
      (set) =>
        set.payer_id === currentUserId &&
        set.payee_id === creditor.userId &&
        set.status === 'pending',
    );

    return {
      id: creditor.userId,
      name: creditor.name,
      avatar: creditor.avatarUrl || '',
      amountOwed: creditor.amount,
      transactions: allTxs,
      rawDebtRelation: creditor,
      hasPendingSettlement, // ส่งค่าไปให้ UI จัดการ
    };
  });
}

export default function TripToPayPage() {
  return (
    <TripFinancesLayout activeTab="settlements">
      <TripToPayContent />
    </TripFinancesLayout>
  );
}

function TripToPayContent() {
  const { finances, user, isOptimized, handleSettleUpTrigger } = useTripFinancesContext();
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const { t, i18n } = useTranslation();

  // Reconstruct creditors list from context
  const nonCentralExpenses = finances.expenses.filter((e) => !e.is_central_fund);
  const nonCentralSettlements = finances.settlements.filter((s) => !s.is_central_fund);

  const creditors = buildCreditorsList(
    user?.id || '',
    finances.summary.whatYouOwe,
    nonCentralExpenses,
    nonCentralSettlements,
    t,
    isOptimized,
    i18n.language,
  );

  const totalYouOwe = creditors.reduce((sum, c) => sum + c.amountOwed, 0);

  // Toggle card expansion
  const toggleCard = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden gap-6 h-full min-h-0 animate-in fade-in-0 duration-300">
      {/* Total Banner Component */}
      <div className="bg-destructive text-destructive-foreground p-6 md:p-8 rounded-2xl shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 transition-all duration-300 transform hover:scale-[1.01] shrink-0 border border-destructive/10">
        <div className="space-y-1.5">
          <span className="text-destructive-foreground/85 text-xs font-bold uppercase tracking-wider font-label">
            {t('finances.totalYouOwe')}
          </span>
          <div className="text-4xl md:text-5xl font-headline font-extrabold tracking-tight">
            ฿
            {totalYouOwe.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
      </div>

      {/* List of People */}
      <div className="flex-1 overflow-y-auto pr-2 pb-10 min-h-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {creditors.length === 0 ? (
            <div className="border-border bg-card animate-in fade-in-0 slide-in-from-bottom-2 flex min-h-[16rem] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-8 text-center duration-500 w-full md:col-span-2">
              <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-full">
                <Check className="h-6 w-6" strokeWidth={2.25} />
              </div>
              <div className="space-y-1">
                <p className="text-foreground text-base font-bold">{t('finances.allSettled')}</p>
                <p className="text-muted-foreground mx-auto max-w-xs text-sm leading-relaxed">
                  {t('finances.youDoNotOweAnyone')}
                </p>
              </div>
            </div>
          ) : (
            creditors.map((creditor) => {
              const isExpanded = !!expandedCards[creditor.id];

              return (
                <CreditorCard
                  key={creditor.id}
                  creditor={creditor}
                  isOptimized={isOptimized}
                  isExpanded={isExpanded}
                  onToggle={() => toggleCard(creditor.id)}
                  onSettleUp={handleSettleUpTrigger}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Informational Help Note */}
      <SettlementHelpNote />
    </div>
  );
}
