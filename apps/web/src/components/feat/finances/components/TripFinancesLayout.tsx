import React, { useState, createContext, useContext, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Plus, CreditCard, AlertCircle, Sparkles } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import { Button } from '@trip-flow/ui/components/button';
import { Skeleton } from '@trip-flow/ui/components/skeleton';
import { cn } from '@trip-flow/ui/lib/cn';
import { useTrip, formatDateRange } from '@/components/feat/trips';
import { useAuth } from '@/hooks/useAuth';
import { BackLink } from '@/components/shared/BackLink';
import { TripPageHeader } from '@/components/shared/TripPageHeader';

// Finances Feature Components & Hooks
import {
  useTripFinances,
  createExpense,
  createSettlement,
  confirmSettlement,
  updateBudget,
  savePaymentDetails,
  CreateExpenseModal,
  SettleUpModal,
  BudgetModal,
  PaymentDetailsModal,
  type DebtRelation,
} from '@/components/feat/finances';

import { TripFinancesAllSkeleton } from './TripFinancesAllSkeleton';
import { TripFinancesAllExpensesSkeleton } from './TripFinancesAllExpensesSkeleton';
import { TripFinancesRepaymentsSkeleton } from './TripFinancesRepaymentsSkeleton';
import { TripFinancesFallbackSkeleton } from './TripFinancesFallbackSkeleton';

type TabId = 'all' | 'all-expense' | 'settlements' | 'monitoring';

interface TripFinancesContextType {
  trip: any;
  finances: any;
  user: any;
  isLoading: boolean;
  isOptimized: boolean;
  setIsOptimized: (v: boolean) => void;
  confirmingSettlementId: string | null;
  handleConfirmSettlementReceived: (settlementId: string) => Promise<void>;
  handleSettleUpTrigger: (payee: DebtRelation) => void;
  setBudgetOpen: (v: boolean) => void;
}

const TripFinancesContext = createContext<TripFinancesContextType | null>(null);

export function useTripFinancesContext() {
  const context = useContext(TripFinancesContext);
  if (!context) {
    throw new Error('useTripFinancesContext must be used within a TripFinancesLayout');
  }
  return context;
}

interface TripFinancesLayoutProps {
  activeTab: TabId;
  children: React.ReactNode;
}

export function TripFinancesLayout({ activeTab, children }: TripFinancesLayoutProps) {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const isToReceive = location.pathname.endsWith('/to-receive');

  const TABS = useMemo(() => [
    { id: 'all' as TabId, label: t('common.all'), path: 'finances' },
    { id: 'all-expense' as TabId, label: t('finances.allExpenses'), path: 'all-expenses' },
    { id: 'settlements' as TabId, label: t('finances.settlements'), path: 'to-receive' },
    { id: 'monitoring' as TabId, label: t('finances.monitoring'), path: 'monitoring' },
  ], [t]);

  // Local state for modals & debt optimization
  const [isOptimized, setIsOptimized] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);
  const [activeSettlePayee, setActiveSettlePayee] = useState<DebtRelation | null>(null);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  // Mutation and submission states
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [isSubmittingSettlement, setIsSubmittingSettlement] = useState(false);
  const [isSubmittingBudget, setIsSubmittingBudget] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [confirmingSettlementId, setConfirmingSettlementId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load general trip detail & members
  const { data: trip, error: tripError, isLoading: isTripLoading } = useTrip(id);

  // Load finances (summary, expenses list, settlements list)
  const {
    data: finances,
    error: financesError,
    isLoading: isFinancesLoading,
    refresh: refreshFinances,
  } = useTripFinances(id, isOptimized);

  const error = tripError || financesError;
  const isLoading = isTripLoading || isFinancesLoading;

  if (error) {
    return (
      <div className="mx-auto max-w-6xl">
        <BackLink to={`/trips/${id}`} label={t('overview.tripOverview')} className="mb-6" />
        <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-4 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error.message}</span>
        </div>
      </div>
    );
  }

  // Handle Recording an Expense
  const handleRecordExpenseSubmit = async (values: any) => {
    if (!id) return;
    setIsSubmittingExpense(true);
    setErrorMsg(null);
    try {
      await createExpense({
        ...values,
        tripId: id,
      });
      await refreshFinances();
      setCreateOpen(false);
    } catch (err) {
      console.error('[finances] failed to record expense', err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save expense');
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  // Handle Recording a P2P Settlement
  const handleSettleUpSubmit = async (payeeId: string, amount: number) => {
    if (!id) return;
    setIsSubmittingSettlement(true);
    setErrorMsg(null);
    try {
      await createSettlement({
        tripId: id,
        payeeId,
        amount,
      });
      await refreshFinances();
      setSettleOpen(false);
    } catch (err) {
      console.error('[finances] failed to record repayment', err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to record repayment');
    } finally {
      setIsSubmittingSettlement(false);
    }
  };

  // Handle Payee Confirming settlement received
  const handleConfirmSettlementReceived = async (settlementId: string) => {
    setConfirmingSettlementId(settlementId);
    setErrorMsg(null);
    try {
      await confirmSettlement(settlementId);
      await refreshFinances();
    } catch (err) {
      console.error('[finances] failed to confirm repayment', err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to confirm repayment');
    } finally {
      setConfirmingSettlementId(null);
    }
  };

  // Handle Updating the Trip Budget
  const handleUpdateBudgetSubmit = async (amount: number) => {
    if (!id) return;
    setIsSubmittingBudget(true);
    setErrorMsg(null);
    try {
      await updateBudget({
        tripId: id,
        amount,
      });
      await refreshFinances();
      setBudgetOpen(false);
    } catch (err) {
      console.error('[finances] failed to update budget', err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update budget');
    } finally {
      setIsSubmittingBudget(false);
    }
  };

  // Handle Saving Payment Receiving details
  const handleSavePaymentDetailsSubmit = async (details: any) => {
    setIsSubmittingPayment(true);
    setErrorMsg(null);
    try {
      await savePaymentDetails(details);
      await refreshFinances();
      setPaymentOpen(false);
    } catch (err) {
      console.error('[finances] failed to save payment details', err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save payment details');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleSettleUpTrigger = (payee: DebtRelation) => {
    setActiveSettlePayee(payee);
    setSettleOpen(true);
  };

  // Dynamic header settings configuration mapping based on activeTab
  const TABS_SETTING_HEADERS: Record<TabId, { title: string; subtitle: React.ReactNode; actions: React.ReactNode }> = {
    all: {
      title: t('finances.title'),
      subtitle: trip ? (
        <Trans 
          i18nKey="finances.managingCostsFor" 
          values={{ title: trip.title, range: formatDateRange(trip.startsOn, trip.endsOn).range }}
          components={{ b: <b /> }}
        />
      ) : (
        <Skeleton className="h-4 w-48" />
      ),
      actions: (
        <>
          <Button
            variant="outline"
            onClick={() => setPaymentOpen(true)}
            className="gap-2 text-xs font-bold rounded-xl border border-border transition-colors h-10 animate-in fade-in duration-300"
          >
            <CreditCard className="h-4 w-4" />
            {t('finances.paymentDetails')}
          </Button>

          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-2 rounded-xl shadow-sm transition-colors h-10 shrink-0 border-none"
          >
            <Plus className="h-4 w-4" />
            {t('finances.recordExpense')}
          </Button>
        </>
      ),
    },
    'all-expense': {
      title: t('finances.allExpenses'),
      subtitle: t('finances.viewAndAudit'),
      actions: (
        <>
          <Button
            variant="outline"
            onClick={() => setPaymentOpen(true)}
            className="gap-2 text-xs font-bold rounded-xl border border-border transition-colors h-10 animate-in fade-in duration-300"
          >
            <CreditCard className="h-4 w-4" />
            {t('finances.paymentDetails')}
          </Button>

          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-2 rounded-xl shadow-sm transition-colors h-10 shrink-0 border-none"
          >
            <Plus className="h-4 w-4" />
            {t('finances.recordExpense')}
          </Button>
        </>
      ),
    },
    settlements: {
      title: t('finances.settlements'),
      subtitle: isToReceive ? t('finances.manageWhoOwesYou') : t('finances.trackMoneyOwe'),
      actions: (
        <div className="flex gap-3 items-center">
          {/* Toggle pill buttons */}
          <div className="bg-muted p-0.5 rounded-xl flex border border-border h-10 shrink-0">
            <button
              onClick={() => navigate(`/trips/${id}/to-receive`)}
              className={cn(
                'px-4 py-1.5 text-xs font-bold rounded-lg transition-all h-[2.125rem] font-label',
                isToReceive
                  ? 'bg-card text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t('finances.toReceive')}
            </button>
            <button
              onClick={() => navigate(`/trips/${id}/to-pay`)}
              className={cn(
                'px-4 py-1.5 text-xs font-bold rounded-lg transition-all h-[2.125rem] font-label',
                !isToReceive
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t('finances.toPay')}
            </button>
          </div>
        </div>
      ),
    },
    monitoring: {
      title: t('finances.financesMonitoring'),
      subtitle: t('finances.observeBudget'),
      actions: (
        <div className="bg-muted p-0.5 rounded-xl flex items-center border border-border h-10 shrink-0">
          <button
            onClick={() => setIsOptimized(!isOptimized)}
            className={cn(
              'px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 h-[2.125rem] font-label',
              isOptimized
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            {isOptimized ? t('finances.optimizedActive') : t('finances.enableOptimization')}
          </button>
        </div>
      ),
    },
  };

  const headerConfig = TABS_SETTING_HEADERS[activeTab] || TABS_SETTING_HEADERS.all;

  return (
    <TripFinancesContext.Provider
      value={{
        trip,
        finances,
        user,
        isLoading,
        isOptimized,
        setIsOptimized,
        confirmingSettlementId,
        handleConfirmSettlementReceived,
        handleSettleUpTrigger,
        setBudgetOpen,
      }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-8 h-full lg:h-[calc(100vh-5.5rem)] lg:overflow-hidden animate-in fade-in duration-300">
        <TripPageHeader
          backTo={`/trips/${id}`}
          backLabel={t('overview.tripOverview')}
          title={headerConfig.title}
          subtitle={headerConfig.subtitle}
          actions={headerConfig.actions}
        />

        {/* Error alert toast */}
        {errorMsg && (
          <div className="border-rose-100 bg-rose-50 text-rose-800 p-4 rounded-xl border text-xs flex items-center gap-2 dark:bg-rose-950/20 dark:border-rose-950/30 dark:text-rose-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex flex-col flex-1 min-h-0 space-y-6">
          {/* 2. Tabs Selector */}
          <div className="border-border flex items-center justify-between gap-3 border-b shrink-0">
            <div className="flex gap-2 overflow-x-auto scrollbar-none" role="tablist" aria-label="Finances view">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === t.id}
                  onClick={() => navigate(`/trips/${id}/${t.path}`)}
                  className={cn(
                    'relative -mb-px px-3 py-2.5 text-sm font-semibold transition-colors sm:px-4 shrink-0',
                    'border-b-2',
                    activeTab === t.id
                      ? 'border-primary text-foreground'
                      : 'text-muted-foreground hover:text-foreground border-transparent',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {activeTab === 'all-expense' && (
              <span className="text-muted-foreground mb-2 hidden text-xs sm:inline shrink-0">
                {t('finances.tipRecordExpense')}
              </span>
            )}
          </div>

          {/* 3. Tab Contents / Skeletons */}
          <div className="flex-1 min-h-0 flex flex-col">
            {isLoading || !trip || !finances ? (
              activeTab === 'all' ? (
                <TripFinancesAllSkeleton />
              ) : activeTab === 'all-expense' ? (
                <TripFinancesAllExpensesSkeleton />
              ) : activeTab === 'settlements' ? (
                <TripFinancesRepaymentsSkeleton />
              ) : (
                <TripFinancesFallbackSkeleton />
              )
            ) : (
              <div className="flex-1 min-h-0 flex flex-col animate-in fade-in-0 duration-300">
                {children}
              </div>
            )}
          </div>

          {/* Modals & Forms */}
          {!isLoading && trip && finances && (
            <>
              {createOpen && (
                <CreateExpenseModal
                  open={createOpen}
                  onOpenChange={setCreateOpen}
                  members={trip.members}
                  currentUserId={user?.id || ''}
                  onSubmit={handleRecordExpenseSubmit}
                  isSubmitting={isSubmittingExpense}
                />
              )}

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

              {budgetOpen && (
                <BudgetModal
                  open={budgetOpen}
                  onOpenChange={setBudgetOpen}
                  initialAmount={finances.summary.budget?.amount || 0}
                  onSubmit={handleUpdateBudgetSubmit}
                  isSubmitting={isSubmittingBudget}
                />
              )}

              {paymentOpen && (
                <PaymentDetailsModal
                  open={paymentOpen}
                  onOpenChange={setPaymentOpen}
                  initialDetails={finances.summary.paymentDetails[user?.id || '']}
                  onSubmit={handleSavePaymentDetailsSubmit}
                  isSubmitting={isSubmittingPayment}
                />
              )}
            </>
          )}
        </div>
      </div>
    </TripFinancesContext.Provider>
  );
}


