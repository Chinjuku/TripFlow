import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
    Bell,
    ChevronDown,
    ChevronUp,
    Check,
    AlertCircle,
    Coffee,
    Car,
    Home,
    Compass,
    ShoppingBag,
    CheckCircle
} from 'lucide-react';
import { TripFinancesLayout, useTripFinancesContext } from '@/components/feat/finances/components/TripFinancesLayout';
import type { DebtRelation, HydratedExpense, HydratedSettlement } from '@/components/feat/finances';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

// Explicit interfaces for types
interface Transaction {
    id: string;
    description: string;
    date: string;
    amount: number;
    category: 'food' | 'transport' | 'accommodation' | 'activity' | 'shopping' | 'lodging' | 'other';
}

interface Debtor {
    id: string;
    name: string;
    avatar: string;
    amountOwed: number;
    transactions: Transaction[];
    hasPendingSettlement: boolean; // เพิ่มฟิลด์นี้สำหรับเช็กว่าเขากดจ่ายมาหรือยัง
    pendingSettlementId: string | null; // ฟิลด์สำหรับใช้อัปเดตและยืนยันการรับเงิน
}

function buildDebtorsList(
  currentUserId: string,
  whoOwesYou: DebtRelation[],
  expenses: HydratedExpense[],
  settlements: HydratedSettlement[],
  t: TFunction,
  isOptimized: boolean
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
          date: exp.expense_date ? new Date(exp.expense_date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }) : t('finances.unknownDate'),
          amount: split.amount,
          category: exp.category as any,
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
          date: exp.expense_date ? new Date(exp.expense_date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }) : t('finances.unknownDate'),
          amount: -split.amount,
          category: exp.category as any,
        };
      })
      .filter(Boolean) as Transaction[];

    const incomingSettlements = settlements
      .filter((set) => set.payer_id === debtor.userId && set.payee_id === currentUserId && set.status === 'completed')
      .map((set) => ({
        id: `set-${set.id}`,
        description: t('finances.repaymentReceived'),
        date: set.created_at ? new Date(set.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }) : t('finances.unknownDate'),
        amount: -set.amount,
        category: 'other' as const,
      }));

    const outgoingSettlements = settlements
      .filter((set) => set.payer_id === currentUserId && set.payee_id === debtor.userId && set.status === 'completed')
      .map((set) => ({
        id: `set-${set.id}`,
        description: t('finances.repaymentSent'),
        date: set.created_at ? new Date(set.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }) : t('finances.unknownDate'),
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
        set.status === 'pending'
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
    const { finances, user, isOptimized, handleConfirmSettlementReceived, confirmingSettlementId } = useTripFinancesContext();

    // Interactive states
    const [remindedList, setRemindedList] = useState<Record<string, boolean>>({});
    const [isRequestingAll, setIsRequestingAll] = useState(false);
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
    const { t } = useTranslation();

    // Reconstruct debtors list from context
    const debtors = buildDebtorsList(
        user.id,
        finances.summary.whoOwesYou,
        finances.expenses,
        finances.settlements,
        t,
        isOptimized
    );

    const totalYouAreOwed = debtors.reduce((sum, d) => sum + d.amountOwed, 0);

    // Handle single reminder action
    const handleRemind = (name: string, id: string) => {
        if (remindedList[id]) return;
        setRemindedList(prev => ({ ...prev, [id]: true }));
        triggerToast(t('finances.toastRemind', { name }));
    };

    // Handle requesting payment from everyone
    const handleRequestAll = () => {
        if (isRequestingAll) return;
        setIsRequestingAll(true);
        const debtorNames = debtors.map(d => d.name).join(' and ');

        setTimeout(() => {
            setIsRequestingAll(false);
            triggerToast(t('finances.toastRequestAll', { names: debtorNames || t('finances.everyone') }));
        }, 1200);
    };

    // Toggle card expansion
    const toggleCard = (id: string) => {
        setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Trigger premium micro-toast
    const triggerToast = (msg: string) => {
        setToastMessage(msg);
        setShowSuccessToast(true);
        setTimeout(() => {
            setShowSuccessToast(false);
        }, 4000);
    };

    // Get icon for categories in transaction breakdown
    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'food':
                return <Coffee className="w-4 h-4 text-amber-500" />;
            case 'transport':
                return <Car className="w-4 h-4 text-blue-500" />;
            case 'lodging':
            case 'accommodation':
                return <Home className="w-4 h-4 text-purple-500" />;
            case 'activity':
                return <Compass className="w-4 h-4 text-emerald-500" />;
            default:
                return <ShoppingBag className="w-4 h-4 text-rose-500" />;
        }
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
                        ฿{totalYouAreOwed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                            const isExpanded = expandedCards[debtor.id];
                            const isReminded = remindedList[debtor.id];

                            return (
                                <div
                                    key={debtor.id}
                                    className="bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col h-fit"
                                >
                                    <div className="p-5 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full overflow-hidden border border-border shrink-0">
                                                {debtor.avatar ? (
                                                    <img
                                                        src={debtor.avatar}
                                                        alt={debtor.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-sm dark:bg-primary/20">
                                                        {debtor.name.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-headline font-bold text-foreground text-base">
                                                    {debtor.name}
                                                </h3>
                                                <p className="text-primary text-xs font-semibold mt-0.5 font-label">
                                                    {t('finances.owesYou')} ฿{debtor.amountOwed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Action Buttons: สลับตามเงื่อนไข hasPendingSettlement */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            {debtor.hasPendingSettlement ? (
                                                <button
                                                    onClick={async () => {
                                                        if (debtor.pendingSettlementId) {
                                                            await handleConfirmSettlementReceived(debtor.pendingSettlementId);
                                                            triggerToast(t('finances.toastConfirmPaid', { name: debtor.name, defaultValue: `ยืนยันการรับเงินจาก ${debtor.name} เรียบร้อยแล้ว` }));
                                                        }
                                                    }}
                                                    disabled={confirmingSettlementId === debtor.pendingSettlementId}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs bg-[#059669] text-white hover:bg-[#047857] transition-all font-label shadow-sm dark:bg-[#10B981]/20 dark:text-[#34D399] dark:border dark:border-[#10B981]/30 dark:hover:bg-[#10B981]/30 animate-in fade-in disabled:opacity-50 disabled:pointer-events-none"
                                                >
                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                    {confirmingSettlementId === debtor.pendingSettlementId ? t('finances.confirming', 'กำลังยืนยัน...') : t('finances.confirmPaid', 'รับเงินแล้ว')}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleRemind(debtor.name, debtor.id)}
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs transition-all font-label animate-in fade-in ${isReminded
                                                        ? 'bg-primary/10 text-primary dark:bg-primary/20'
                                                        : 'bg-muted hover:bg-accent text-primary'
                                                        }`}
                                                >
                                                    {isReminded ? (
                                                        <>
                                                            <Check className="w-3.5 h-3.5" />
                                                            {t('finances.reminded')}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Bell className="w-3.5 h-3.5" />
                                                            {t('finances.remind')}
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Accordion Divider & Toggle Button */}
                                    <div className="border-t border-border bg-muted/20 dark:bg-muted/10">
                                        <button
                                            onClick={() => toggleCard(debtor.id)}
                                            className="w-full px-5 py-3 text-xs font-bold text-muted-foreground hover:text-foreground flex items-center justify-between transition-colors cursor-pointer font-label"
                                        >
                                            <span>
                                                {isOptimized 
                                                    ? t('finances.viewUnderlyingSplits', { count: debtor.transactions.length })
                                                    : t('finances.viewTransactions', { count: debtor.transactions.length })
                                                }
                                            </span>
                                            {isExpanded ? (
                                                <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                            )}
                                        </button>

                                        {/* Accordion Content */}
                                        {isExpanded && (
                                            <div className="px-5 pb-5 pt-1 space-y-2 bg-card animate-in slide-in-from-top-2 duration-200">
                                                {debtor.transactions.length === 0 ? (
                                                    <p className="text-muted-foreground text-xs py-2 italic font-label">{t('finances.noTransactionRecords')}</p>
                                                ) : (
                                                    debtor.transactions.map((tx) => (
                                                        <div
                                                            key={tx.id}
                                                            className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/40 hover:border-border transition-all"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 rounded-lg bg-card border border-border/80 shadow-sm shrink-0">
                                                                    {getCategoryIcon(tx.category)}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="font-semibold text-xs text-foreground truncate">
                                                                        {tx.description}
                                                                    </p>
                                                                    <p className="text-[10px] text-muted-foreground font-medium font-label">
                                                                        {tx.date}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <span className={`font-headline font-bold text-xs whitespace-nowrap ${tx.amount > 0 ? 'text-primary' : 'text-destructive'}`}>
                                                                {tx.amount > 0 ? '+' : '-'}฿{Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </span>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Informational Help Note */}
            <div className="bg-primary/[0.03] border border-primary/10 rounded-2xl p-5 flex gap-3 text-xs md:text-sm shadow-sm shrink-0">
                <AlertCircle className="w-5 h-5 text-primary shrink-0" />
                <div className="space-y-1">
                    <h4 className="font-bold text-foreground font-headline">{t('finances.aboutAutomaticSettlements')}</h4>
                    <p className="font-medium text-muted-foreground leading-relaxed">
                        {t('finances.automaticSettlementsDesc')}
                    </p>
                </div>
            </div>

            {/* Success Notification (Toast) */}
            {showSuccessToast && (
                <div className="fixed bottom-6 right-6 z-50 bg-primary text-primary-foreground py-3.5 px-5 rounded-xl shadow-xl flex items-center gap-3 border border-primary/10 animate-in fade-in-0 slide-in-from-bottom-5 duration-300">
                    <div className="bg-primary-foreground/20 p-1 rounded-lg">
                        <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <span className="text-xs md:text-sm font-bold tracking-wide font-label">
                        {toastMessage}
                    </span>
                </div>
            )}
        </div>
    );
}