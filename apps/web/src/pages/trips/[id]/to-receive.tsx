import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    Bell,
    ChevronDown,
    ChevronUp,
    Check,
    ArrowLeft,
    DollarSign,
    AlertCircle,
    Coffee,
    Car,
    Home,
    Compass,
    ShoppingBag,
    Sparkles
} from 'lucide-react';
import { Button } from '@trip-flow/ui/components/button';
import { Skeleton } from '@trip-flow/ui/components/skeleton';
import { useAuth } from '@/features/auth/useAuth';
import {
    useTripFinances,
    createSettlement,
    SettleUpModal,
    type DebtRelation,
    type HydratedExpense,
    type HydratedSettlement
} from '@/features/finances';

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
}

interface Creditor {
    id: string;
    name: string;
    avatar: string;
    amountOwed: number;
    transactions: Transaction[];
}

function buildDebtorsList(
  currentUserId: string,
  whoOwesYou: DebtRelation[],
  expenses: HydratedExpense[],
  settlements: HydratedSettlement[]
): Debtor[] {
  return whoOwesYou.map((debtor) => {
    // Reconstruct contributing transactions between debtor and currentUserId.
    const positiveTxs = expenses
      .filter((exp) => exp.paid_by_id === currentUserId)
      .map((exp) => {
        const split = exp.splits.find((s) => s.user_id === debtor.userId);
        if (!split) return null;
        return {
          id: `exp-${exp.id}`,
          description: exp.description,
          date: exp.expense_date ? new Date(exp.expense_date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }) : 'Unknown date',
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
        return {
          id: `exp-${exp.id}`,
          description: exp.description,
          date: exp.expense_date ? new Date(exp.expense_date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }) : 'Unknown date',
          amount: -split.amount,
          category: exp.category as any,
        };
      })
      .filter(Boolean) as Transaction[];

    const incomingSettlements = settlements
      .filter((set) => set.payer_id === debtor.userId && set.payee_id === currentUserId && set.status === 'completed')
      .map((set) => ({
        id: `set-${set.id}`,
        description: 'Repayment Received',
        date: set.created_at ? new Date(set.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }) : 'Unknown date',
        amount: -set.amount,
        category: 'other' as const,
      }));

    const outgoingSettlements = settlements
      .filter((set) => set.payer_id === currentUserId && set.payee_id === debtor.userId && set.status === 'completed')
      .map((set) => ({
        id: `set-${set.id}`,
        description: 'Repayment Sent',
        date: set.created_at ? new Date(set.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }) : 'Unknown date',
        amount: set.amount,
        category: 'other' as const,
      }));

    const allTxs = [...positiveTxs, ...negativeTxs, ...incomingSettlements, ...outgoingSettlements];

    return {
      id: debtor.userId,
      name: debtor.name,
      avatar: debtor.avatarUrl || '',
      amountOwed: debtor.amount,
      transactions: allTxs,
    };
  });
}

function buildCreditorsList(
  currentUserId: string,
  whatYouOwe: DebtRelation[],
  expenses: HydratedExpense[],
  settlements: HydratedSettlement[]
): Creditor[] {
  return whatYouOwe.map((creditor) => {
    const positiveTxs = expenses
      .filter((exp) => exp.paid_by_id === creditor.userId)
      .map((exp) => {
        const split = exp.splits.find((s) => s.user_id === currentUserId);
        if (!split) return null;
        return {
          id: `exp-${exp.id}`,
          description: exp.description,
          date: exp.expense_date ? new Date(exp.expense_date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }) : 'Unknown date',
          amount: split.amount,
          category: exp.category as any,
        };
      })
      .filter(Boolean) as Transaction[];

    const negativeTxs = expenses
      .filter((exp) => exp.paid_by_id === currentUserId)
      .map((exp) => {
        const split = exp.splits.find((s) => s.user_id === creditor.userId);
        if (!split) return null;
        return {
          id: `exp-${exp.id}`,
          description: exp.description,
          date: exp.expense_date ? new Date(exp.expense_date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }) : 'Unknown date',
          amount: -split.amount,
          category: exp.category as any,
        };
      })
      .filter(Boolean) as Transaction[];

    const incomingSettlements = settlements
      .filter((set) => set.payer_id === currentUserId && set.payee_id === creditor.userId && set.status === 'completed')
      .map((set) => ({
        id: `set-${set.id}`,
        description: 'Repayment Sent',
        date: set.created_at ? new Date(set.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }) : 'Unknown date',
        amount: -set.amount,
        category: 'other' as const,
      }));

    const outgoingSettlements = settlements
      .filter((set) => set.payer_id === creditor.userId && set.payee_id === currentUserId && set.status === 'completed')
      .map((set) => ({
        id: `set-${set.id}`,
        description: 'Repayment Received',
        date: set.created_at ? new Date(set.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }) : 'Unknown date',
        amount: set.amount,
        category: 'other' as const,
      }));

    const allTxs = [...positiveTxs, ...negativeTxs, ...incomingSettlements, ...outgoingSettlements];

    return {
      id: creditor.userId,
      name: creditor.name,
      avatar: creditor.avatarUrl || '',
      amountOwed: creditor.amount,
      transactions: allTxs,
    };
  });
}

export default function TripToReceivePage() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();

    // Navigation active tab: 'pay' or 'receive'
    const [activeTab, setActiveTab] = useState<'pay' | 'receive'>('receive');

    // Interactive states
    const [isOptimized, setIsOptimized] = useState(false);
    const [remindedList, setRemindedList] = useState<Record<string, boolean>>({});
    const [isRequestingAll, setIsRequestingAll] = useState(false);
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

    const [settleOpen, setSettleOpen] = useState(false);
    const [activeSettlePayee, setActiveSettlePayee] = useState<DebtRelation | null>(null);
    const [isSubmittingSettlement, setIsSubmittingSettlement] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Fetch live finances from the database
    const {
        data: finances,
        error: financesError,
        isLoading,
        refresh: refreshFinances
    } = useTripFinances(id, isOptimized);

    // Handle loading skeleton
    if (isLoading || !finances || !user) {
        return (
            <div className="mx-auto flex max-w-6xl flex-col gap-6 animate-pulse">
                {/* Header skeleton */}
                <div className="border-border flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-10 w-44 rounded-xl" />
                </div>
                {/* Banner skeleton */}
                <Skeleton className="h-32 rounded-2xl w-full" />
                {/* List skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[0, 1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-28 rounded-2xl w-full" />
                    ))}
                </div>
            </div>
        );
    }

    // Handle error state
    if (financesError) {
        return (
            <div className="mx-auto max-w-6xl">
                <Link
                    to={id ? `/trips/${id}/finances` : '/trips'}
                    className="text-muted-foreground hover:text-primary mb-6 inline-flex items-center gap-2 text-xs font-semibold transition-colors"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to Finances
                </Link>
                <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-4 text-sm flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>{financesError.message}</span>
                </div>
            </div>
        );
    }

    // Reconstruct debtors & creditors from database fields
    const debtors = buildDebtorsList(
        user.id,
        finances.summary.whoOwesYou,
        finances.expenses,
        finances.settlements
    );

    const creditors = buildCreditorsList(
        user.id,
        finances.summary.whatYouOwe,
        finances.expenses,
        finances.settlements
    );

    // Calculate totals
    const totalYouAreOwed = debtors.reduce((sum, d) => sum + d.amountOwed, 0);
    const totalYouOwe = creditors.reduce((sum, c) => sum + c.amountOwed, 0);

    // Handle single reminder action
    const handleRemind = (name: string, id: string) => {
        if (remindedList[id]) return;

        setRemindedList(prev => ({ ...prev, [id]: true }));
        triggerToast(`Sent payment reminder to ${name}!`);
    };

    // Handle requesting payment from everyone
    const handleRequestAll = () => {
        if (isRequestingAll) return;
        setIsRequestingAll(true);

        const debtorNames = debtors.map(d => d.name).join(' and ');

        setTimeout(() => {
            setIsRequestingAll(false);
            triggerToast(`Sent payment requests to ${debtorNames || 'everyone'}!`);
        }, 1200);
    };

    // Trigger payment modal
    const handleSettleUpTrigger = (creditor: Creditor) => {
        const debtRelation: DebtRelation = {
            userId: creditor.id,
            name: creditor.name,
            avatarUrl: creditor.avatar,
            amount: creditor.amountOwed
        };
        setActiveSettlePayee(debtRelation);
        setSettleOpen(true);
    };

    // Submit settlement to Elysia API & DB
    const handleSettleUpSubmit = async (payeeId: string, amount: number) => {
        if (!id) return;
        setIsSubmittingSettlement(true);
        setErrorMsg(null);
        try {
            await createSettlement({
                tripId: id,
                payeeId,
                amount
            });
            await refreshFinances();
            triggerToast(`Recorded pending settlement of $${amount.toFixed(2)}!`);
            setSettleOpen(false);
        } catch (err) {
            console.error('[to-receive] failed to record repayment', err);
            setErrorMsg(err instanceof Error ? err.message : 'Failed to record repayment');
        } finally {
            setIsSubmittingSettlement(false);
        }
    };

    // Toggle card expansion
    const toggleCard = (id: string) => {
        setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Global helper to trigger premium micro-toast
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
        <div className="mx-auto flex max-w-6xl flex-col gap-6 animate-in fade-in-0 duration-300">

            {/* Error alert toast */}
            {errorMsg && (
                <div className="border-destructive/30 bg-destructive/10 text-destructive p-4 rounded-xl border text-xs flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}

            {/* Header */}
            <div className="border-border flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-1.5">
                    <Link
                        to={id ? `/trips/${id}/finances` : '/trips'}
                        className="text-muted-foreground hover:text-primary mb-1 inline-flex items-center gap-2 text-xs font-semibold transition-colors"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back to Finances
                    </Link>
                    <h1 className="text-foreground font-headline text-2xl sm:text-3xl font-extrabold tracking-tight">
                        Settlements
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium">
                        {activeTab === 'receive' ? 'Manage who owes you money.' : 'Track the money you owe others.'}
                    </p>
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                    {/* Debt Optimization Toggle */}
                    <div className="bg-muted p-0.5 rounded-xl flex items-center border border-border">
                        <button
                            onClick={() => setIsOptimized(!isOptimized)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                                isOptimized
                                    ? 'bg-[#0F5132] text-white shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            {isOptimized ? 'Optimized Active' : 'Enable Optimization'}
                        </button>
                    </div>

                    {/* Toggle pill buttons */}
                    <div className="bg-muted p-0.5 rounded-xl flex max-w-fit border border-border">
                        <button
                            onClick={() => setActiveTab('pay')}
                            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                activeTab === 'pay'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            To Pay
                        </button>
                        <button
                            onClick={() => setActiveTab('receive')}
                            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                activeTab === 'receive'
                                    ? 'bg-background text-emerald-700 dark:text-emerald-400 shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            To Receive
                        </button>
                    </div>
                </div>
            </div>

            {/* 3. Main Total Banner Component */}
            {activeTab === 'receive' ? (
                <div className="bg-emerald-600 text-white p-6 md:p-8 rounded-2xl shadow-lg shadow-emerald-600/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 transition-all duration-300 transform hover:scale-[1.01]">
                    <div className="space-y-1.5">
                        <span className="text-emerald-100 text-xs font-bold uppercase tracking-wider">
                            Total You Are Owed
                        </span>
                        <div className="text-4xl md:text-5xl font-headline font-extrabold tracking-tight">
                            ${totalYouAreOwed.toFixed(2)}
                        </div>
                    </div>
                    <button
                        onClick={handleRequestAll}
                        disabled={isRequestingAll || totalYouAreOwed === 0}
                        className="bg-white hover:bg-emerald-50 active:scale-95 text-emerald-600 font-bold text-xs md:text-sm px-5 py-3 rounded-xl shadow-sm transition-all w-full sm:w-auto text-center cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {isRequestingAll ? 'Requesting...' : 'Request All'}
                    </button>
                </div>
            ) : (
                <div className="bg-slate-900 text-white p-6 md:p-8 rounded-2xl shadow-lg shadow-slate-950/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 transition-all duration-300 transform hover:scale-[1.01]">
                    <div className="space-y-1.5">
                        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                            Total You Owe
                        </span>
                        <div className="text-4xl md:text-5xl font-headline font-extrabold tracking-tight">
                            ${totalYouOwe.toFixed(2)}
                        </div>
                    </div>
                    {totalYouOwe > 0 && (
                        <span className="text-[10px] text-slate-350 bg-white/10 px-3 py-1.5 rounded-lg font-medium border border-white/10">
                            Tap individual payees to settle up
                        </span>
                    )}
                </div>
            )}

            {/* 4. Lists of People */}
            <div className="space-y-4">
                {activeTab === 'receive' ? (
                    // Debtors (Who owe me)
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {debtors.length === 0 ? (
                            <div className="border-border bg-card animate-in fade-in-0 slide-in-from-bottom-2 flex min-h-[16rem] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-8 text-center duration-500 w-full md:col-span-2">
                                <div className="bg-emerald-100/50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 flex h-12 w-12 items-center justify-center rounded-full">
                                    <Check className="h-6 w-6" strokeWidth={2.25} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-foreground text-base font-bold">All Settled!</p>
                                    <p className="text-muted-foreground mx-auto max-w-xs text-sm leading-relaxed">
                                        No one owes you money right now. Happy travels!
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
                                        className="bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col"
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
                                                        <div className="w-full h-full flex items-center justify-center bg-emerald-500/10 text-emerald-600 font-bold text-sm dark:bg-emerald-500/20 dark:text-emerald-300">
                                                            {debtor.name.charAt(0)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="font-headline font-bold text-foreground text-base">
                                                        {debtor.name}
                                                    </h3>
                                                    <p className="text-muted-foreground text-xs font-semibold mt-0.5">
                                                        Owes you ${debtor.amountOwed.toFixed(2)}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Remind Button */}
                                            <button
                                                onClick={() => handleRemind(debtor.name, debtor.id)}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs transition-all ${isReminded
                                                    ? 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                                                    : 'bg-muted hover:bg-accent text-primary'
                                                    }`}
                                            >
                                                {isReminded ? (
                                                    <>
                                                        <Check className="w-3.5 h-3.5" />
                                                        Reminded
                                                    </>
                                                ) : (
                                                    <>
                                                        <Bell className="w-3.5 h-3.5" />
                                                        Remind
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        {/* Accordion Divider & Toggle Button */}
                                        <div className="border-t border-border bg-muted/20 dark:bg-muted/10">
                                            <button
                                                onClick={() => toggleCard(debtor.id)}
                                                className="w-full px-5 py-3 text-xs font-bold text-muted-foreground hover:text-foreground flex items-center justify-between transition-colors cursor-pointer"
                                            >
                                                <span>
                                                    {isOptimized 
                                                        ? `View underlying pairwise splits (${debtor.transactions.length})`
                                                        : `View ${debtor.transactions.length} Transactions`
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
                                                        <p className="text-muted-foreground text-xs py-2 italic">No transaction records found.</p>
                                                    ) : (
                                                        debtor.transactions.map((tx) => (
                                                            <div
                                                                key={tx.id}
                                                                className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/40 hover:border-border transition-all"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="p-2 rounded-lg bg-card border border-border/80 shadow-sm shrink-0">
                                                                        {getCategoryIcon(tx.category)}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="font-semibold text-xs text-foreground truncate">
                                                                            {tx.description}
                                                                        </p>
                                                                        <p className="text-[10px] text-muted-foreground font-medium">
                                                                            {tx.date}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <span className={`font-bold text-xs whitespace-nowrap ${tx.amount > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                                                                    {tx.amount > 0 ? '+' : ''}${tx.amount.toFixed(2)}
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
                ) : (
                    // Creditors (Who I owe)
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {creditors.length === 0 ? (
                            <div className="border-border bg-card animate-in fade-in-0 slide-in-from-bottom-2 flex min-h-[16rem] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-8 text-center duration-500 w-full md:col-span-2">
                                <div className="bg-blue-100/50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 flex h-12 w-12 items-center justify-center rounded-full">
                                    <Check className="h-6 w-6" strokeWidth={2.25} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-foreground text-base font-bold">Zero Debts!</p>
                                    <p className="text-muted-foreground mx-auto max-w-xs text-sm leading-relaxed">
                                        You do not owe anyone right now. Splendid job!
                                    </p>
                                </div>
                            </div>
                        ) : (
                            creditors.map((creditor) => {
                                const isExpanded = expandedCards[creditor.id];

                                return (
                                    <div
                                        key={creditor.id}
                                        className="bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col"
                                    >
                                        <div className="p-5 flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-full overflow-hidden border border-border shrink-0">
                                                    {creditor.avatar ? (
                                                        <img
                                                            src={creditor.avatar}
                                                            alt={creditor.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-rose-500/10 text-rose-600 font-bold text-sm dark:bg-rose-500/20 dark:text-rose-300">
                                                            {creditor.name.charAt(0)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="font-headline font-bold text-foreground text-base">
                                                        {creditor.name}
                                                    </h3>
                                                    <p className="text-muted-foreground text-xs font-semibold mt-0.5">
                                                        You owe ${creditor.amountOwed.toFixed(2)}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Settle Up / Record payment button */}
                                            <button
                                                onClick={() => handleSettleUpTrigger(creditor)}
                                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs transition-all bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow active:scale-95 cursor-pointer"
                                            >
                                                <DollarSign className="w-3.5 h-3.5" />
                                                Settle Up
                                            </button>
                                        </div>

                                        {/* Accordion Divider & Toggle Button */}
                                        <div className="border-t border-border bg-muted/20 dark:bg-muted/10">
                                            <button
                                                onClick={() => toggleCard(creditor.id)}
                                                className="w-full px-5 py-3 text-xs font-bold text-muted-foreground hover:text-foreground flex items-center justify-between transition-colors cursor-pointer"
                                            >
                                                <span>
                                                    {isOptimized 
                                                        ? `View underlying pairwise splits (${creditor.transactions.length})`
                                                        : `View ${creditor.transactions.length} Transactions`
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
                                                    {creditor.transactions.length === 0 ? (
                                                        <p className="text-muted-foreground text-xs py-2 italic">No transaction records found.</p>
                                                    ) : (
                                                        creditor.transactions.map((tx) => (
                                                            <div
                                                                key={tx.id}
                                                                className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/40 hover:border-border transition-all"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="p-2 rounded-lg bg-card border border-border/80 shadow-sm shrink-0">
                                                                        {getCategoryIcon(tx.category)}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="font-semibold text-xs text-foreground truncate">
                                                                            {tx.description}
                                                                        </p>
                                                                        <p className="text-[10px] text-muted-foreground font-medium">
                                                                            {tx.date}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <span className={`font-bold text-xs whitespace-nowrap ${tx.amount > 0 ? 'text-rose-600' : 'text-muted-foreground'}`}>
                                                                    {tx.amount > 0 ? '-' : ''}${Math.abs(tx.amount).toFixed(2)}
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
                )}
            </div>

            {/* Informational Help Note */}
            <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-2xl p-5 flex gap-3 text-emerald-850 text-xs md:text-sm shadow-sm dark:bg-slate-900/40 dark:border-emerald-950/20 dark:text-emerald-400">
                <AlertCircle className="w-5 h-5 text-emerald-600 shrink-0 dark:text-emerald-500" />
                <div className="space-y-1">
                    <h4 className="font-bold text-foreground">About Automatic Settlements</h4>
                    <p className="font-medium text-muted-foreground leading-relaxed">
                        All transactions listed are calculated based on your group expenses inside this trip workspace.
                        Clicking "Remind" sends a clean instant push notification, and "Settle Up" records payment details in the shared database.
                    </p>
                </div>
            </div>

            {/* 5. Custom Success Notification (Toast) */}
            {showSuccessToast && (
                <div className="fixed bottom-6 right-6 z-50 bg-emerald-650 text-white py-3.5 px-5 rounded-xl shadow-xl flex items-center gap-3 border border-emerald-500/10 animate-in fade-in-0 slide-in-from-bottom-5 duration-300">
                    <div className="bg-white/20 p-1 rounded-lg">
                        <Check className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-xs md:text-sm font-bold tracking-wide">
                        {toastMessage}
                    </span>
                </div>
            )}

            {/* 6. Settle Up Modal */}
            {settleOpen && activeSettlePayee && (
                <SettleUpModal
                    open={settleOpen}
                    onOpenChange={setSettleOpen}
                    payee={activeSettlePayee}
                    paymentDetails={finances.summary.paymentDetails[activeSettlePayee.userId]}
                    onSubmit={handleSettleUpSubmit}
                    isSubmitting={isSubmittingSettlement}
                />
            )}
        </div>
    );
}
