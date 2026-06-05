import { useState } from 'react';
import { Check } from 'lucide-react';
import {
  TripFinancesLayout,
  useTripFinancesContext,
  SettlementHelpNote,
  DebtorCard,
  type Debtor,
} from '@/components/feat/finances';
import type { DebtRelation, HydratedExpense, HydratedSettlement } from '@/components/feat/finances';
import type { Transaction } from '@/types/finances';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { formatLocalizedDate } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';

function buildDebtorsList(
  currentUserId: string,
  whoOwesYou: DebtRelation[],
  expenses: HydratedExpense[],
  settlements: HydratedSettlement[],
  t: TFunction,
  isOptimized: boolean,
  lng: string,
): Debtor[] {
  return whoOwesYou.map((debtor) => {
    // Reconstruct contributing transactions between debtor and currentUserId.
    const positiveTxs = expenses
      .filter((exp) => exp.paid_by_id === currentUserId)
      .map((exp) => {
        const split = exp.splits.find((s) => s.user_id === debtor.userId);
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
      .filter((exp) => exp.paid_by_id === debtor.userId)
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
          amount: -split.amount,
          category: exp.category,
        };
      })
      .filter(Boolean) as Transaction[];

    const incomingSettlements = settlements
      .filter(
        (set) =>
          set.payer_id === debtor.userId &&
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
        amount: -set.amount,
        category: 'other' as const,
      }));

    const outgoingSettlements = settlements
      .filter(
        (set) =>
          set.payer_id === currentUserId &&
          set.payee_id === debtor.userId &&
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
        amount: set.amount,
        category: 'other' as const,
      }));

    const allTxs = isOptimized
      ? [...positiveTxs, ...negativeTxs, ...incomingSettlements, ...outgoingSettlements]
      : [...positiveTxs, ...incomingSettlements];

    // ตรวจสอบว่ามีรายการที่อีกฝั่งกดจ่ายมาแล้ว และกำลังรอเรายืนยัน (pending) หรือไม่
    const pendingSettlement = settlements.find(
      (set) =>
        set.payer_id === debtor.userId &&
        set.payee_id === currentUserId &&
        set.status === 'pending',
    );

    return {
      id: debtor.userId,
      name: debtor.name,
      avatar: debtor.avatarUrl || '',
      amountOwed: debtor.amount,
      transactions: allTxs,
      hasPendingSettlement: !!pendingSettlement, // ส่งค่ามาให้ UI นำไปใช้สลับปุ่ม
      pendingSettlementId: pendingSettlement?.id || null,
    };
  });
}

export default function TripToReceivePage() {
  return (
    <TripFinancesLayout activeTab="settlements">
      <TripToReceiveContent />
    </TripFinancesLayout>
  );
}

function TripToReceiveContent() {
  const { finances, user, isOptimized, handleConfirmSettlementReceived, confirmingSettlementId } =
    useTripFinancesContext();

  // Interactive states
  const [remindedList, setRemindedList] = useState<Record<string, boolean>>({});
  const [isRequestingAll, setIsRequestingAll] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const { t, i18n } = useTranslation();
  const toast = useToast();

  // Reconstruct debtors list from context
  const nonCentralExpenses = finances.expenses.filter((e) => !e.is_central_fund);
  const nonCentralSettlements = finances.settlements.filter((s) => !s.is_central_fund);

  const debtors = buildDebtorsList(
    user?.id ?? '',
    finances.summary.whoOwesYou,
    nonCentralExpenses,
    nonCentralSettlements,
    t,
    isOptimized,
    i18n.language,
  );

  const totalYouAreOwed = debtors.reduce((sum, d) => sum + d.amountOwed, 0);

  // Handle single reminder action
  const handleRemind = (name: string, id: string) => {
    if (remindedList[id]) return;
    setRemindedList((prev) => ({ ...prev, [id]: true }));
    toast.success(t('finances.toastRemind', { name }));
  };

  // Handle requesting payment from everyone
  const handleRequestAll = () => {
    if (isRequestingAll) return;
    setIsRequestingAll(true);
    const debtorNames = debtors.map((d) => d.name).join(' and ');

    setTimeout(() => {
      setIsRequestingAll(false);
      toast.success(t('finances.toastRequestAll', { names: debtorNames || t('finances.everyone') }));
    }, 1200);
  };

  // Toggle card expansion
  const toggleCard = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleConfirmSettlementWithToast = async (
    pendingSettlementId: string,
    debtorName: string,
  ) => {
    await handleConfirmSettlementReceived(pendingSettlementId);
    toast.success(
      t('finances.toastConfirmPaid', {
        name: debtorName,
        defaultValue: `ยืนยันการรับเงินจาก ${debtorName} เรียบร้อยแล้ว`,
      }),
    );
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden gap-6 h-full min-h-0 animate-in fade-in-0 duration-300">
      {/* Total Banner Component */}
      <div className="bg-primary text-primary-foreground p-6 md:p-8 rounded-2xl shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 transition-all duration-300 transform hover:scale-[1.01] shrink-0">
        <div className="space-y-1.5">
          <span className="text-primary-foreground/85 text-xs font-bold uppercase tracking-wider font-label">
            {t('finances.totalYouAreOwed')}
          </span>
          <div className="text-4xl md:text-5xl font-headline font-extrabold tracking-tight">
            ฿
            {totalYouAreOwed.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
        <button
          onClick={handleRequestAll}
          disabled={isRequestingAll || totalYouAreOwed === 0}
          className="bg-white dark:bg-card text-primary font-bold text-xs md:text-sm px-5 py-3 rounded-xl shadow-sm transition-all w-full sm:w-auto text-center cursor-pointer disabled:opacity-50 disabled:pointer-events-none active:scale-95 font-label"
        >
          {isRequestingAll ? t('finances.requesting') : t('finances.requestAll')}
        </button>
      </div>

      {/* List of People */}
      <div className="flex-1 overflow-y-auto pr-2 pb-10 min-h-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {debtors.length === 0 ? (
            <div className="border-border bg-card animate-in fade-in-0 slide-in-from-bottom-2 flex min-h-[16rem] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-8 text-center duration-500 w-full md:col-span-2">
              <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-full">
                <Check className="h-6 w-6" strokeWidth={2.25} />
              </div>
              <div className="space-y-1">
                <p className="text-foreground text-base font-bold">{t('finances.allSettled')}</p>
                <p className="text-muted-foreground mx-auto max-w-xs text-sm leading-relaxed">
                  {t('finances.noOneOwesYou')}
                </p>
              </div>
            </div>
          ) : (
            debtors.map((debtor) => {
              const isExpanded = !!expandedCards[debtor.id];
              const isReminded = !!remindedList[debtor.id];

              return (
                <DebtorCard
                  key={debtor.id}
                  debtor={debtor}
                  isOptimized={isOptimized}
                  isExpanded={isExpanded}
                  onToggle={() => toggleCard(debtor.id)}
                  onConfirmSettlement={handleConfirmSettlementWithToast}
                  confirmingSettlementId={confirmingSettlementId}
                  isReminded={isReminded}
                  onRemind={handleRemind}
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
