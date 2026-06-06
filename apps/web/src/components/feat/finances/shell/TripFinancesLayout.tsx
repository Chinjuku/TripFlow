import React, { useState, createContext, useContext, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Plus, CreditCard, AlertCircle, Sparkles } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { useTrip } from '@/hooks/useTrips';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { BackLink } from '@/components/shared/navigation/BackLink';
import { PageHeader } from '@/components/shared/navigation/PageHeader';
import { formatLocalizedDateRange } from '@/lib/utils';

// Finances Feature Components & Hooks
import {
  useTripFinances,
  createExpense,
  createSettlement,
  confirmSettlement,
  deleteSettlement,
  updateBudget,
  optimizeTrip,
  savePaymentDetails,
  CreateExpenseModal,
  SettleUpModal,
  BudgetModal,
  PaymentDetailsModal,
  type DebtRelation,
  type FinancesData,
  type HydratedSettlement,
  type CreateExpensePayload,
  type SavePaymentDetailsPayload,
} from '@/components/feat/finances';
import type { TripDetail } from '@/types/trips';
import type { AuthUser } from '@/types/auth';

import { TripFinancesAllSkeleton } from './TripFinancesAllSkeleton';
import { TripFinancesAllExpensesSkeleton } from '../expenses/TripFinancesAllExpensesSkeleton';
import { TripFinancesRepaymentsSkeleton } from './TripFinancesRepaymentsSkeleton';
import { TripFinancesFallbackSkeleton } from './TripFinancesFallbackSkeleton';
import { CentralFundSkeleton } from '@/components/feat/finances/central-fund/CentralFundSkeleton';

type TabId = 'all' | 'all-expense' | 'settlements' | 'monitoring' | 'central-fund';

interface TripFinancesContextType {
  // `trip` and `finances` are guaranteed non-null here: the layout only renders
  // its children (the consumers of this context) once both have loaded.
  trip: TripDetail;
  finances: FinancesData;
  user: AuthUser | null;
  isLoading: boolean;
  isOptimized: boolean;
  setIsOptimized: (v: boolean) => void;
  confirmingSettlementId: string | null;
  handleConfirmSettlementReceived: (settlementId: string) => Promise<void>;
  handleDeleteSettlement: (settlementId: string) => Promise<void>;
  handleSettleUpTrigger: (payee: DebtRelation, isCentralFund?: boolean) => void;
  setBudgetOpen: (v: boolean) => void;
  refreshFinances: (silent?: boolean) => Promise<void>;
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
  const { t, i18n } = useTranslation();
  const isToReceive = location.pathname.endsWith('/to-receive');

  const TABS = useMemo(
    () => [
      { id: 'all' as TabId, label: t('common.all'), path: 'finances' },
      { id: 'all-expense' as TabId, label: t('finances.allExpenses'), path: 'all-expenses' },
      { id: 'settlements' as TabId, label: t('finances.settlements'), path: 'to-receive' },
      {
        id: 'central-fund' as TabId,
        label: t('finances.centralFund.title', 'Central Fund'),
        path: 'central-fund',
      },
      { id: 'monitoring' as TabId, label: t('finances.monitoring'), path: 'monitoring' },
    ],
    [t],
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);
  const [activeSettlePayee, setActiveSettlePayee] = useState<DebtRelation | null>(null);
  const [defaultIsCentralFund, setDefaultIsCentralFund] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  // Mutation and submission states
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [isSubmittingSettlement, setIsSubmittingSettlement] = useState(false);
  const [isSubmittingBudget, setIsSubmittingBudget] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [confirmingSettlementId, setConfirmingSettlementId] = useState<string | null>(null);
  const toast = useToast();

  // Load general trip detail & members
  const {
    data: trip,
    error: tripError,
    isLoading: isTripLoading,
    refresh: refreshTrip,
  } = useTrip(id);

  const isOptimized = trip?.isDebtOptimized ?? false;

  const setIsOptimized = async (val: boolean) => {
    if (!id) return;
    try {
      await optimizeTrip(id, val);
      await Promise.all([refreshFinances(), refreshTrip()]);
    } catch (err) {
      console.error('[finances] failed to toggle optimization', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update optimization setting');
    }
  };

  // Use the global optimization setting directly
  const queryOptimized = isOptimized;

  // Load finances (summary, expenses list, settlements list)
  const {
    data: finances,
    error: financesError,
    isLoading: isFinancesLoading,
    refresh: refreshFinances,
  } = useTripFinances(id, queryOptimized);

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
  const handleRecordExpenseSubmit = async (values: Omit<CreateExpensePayload, 'tripId'>) => {
    if (!id) return;
    setIsSubmittingExpense(true);
    try {
      await createExpense({
        ...values,
        tripId: id,
      });
      await refreshFinances();
      setCreateOpen(false);
    } catch (err) {
      console.error('[finances] failed to record expense', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save expense');
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  // Handle Recording a P2P Settlement
  const handleSettleUpSubmit = async (payeeId: string, amount: number, isCentralFund?: boolean) => {
    if (!id) return null;
    setIsSubmittingSettlement(true);
    try {
      const created = await createSettlement({
        tripId: id,
        payeeId,
        amount,
        isCentralFund,
      });
      await refreshFinances(true);
      // setSettleOpen(false) is now handled by the modal to support slip upload wait
      return created;
    } catch (err) {
      console.error('[finances] failed to record repayment', err);
      toast.error(err instanceof Error ? err.message : 'Failed to record repayment');
      return null;
    } finally {
      setIsSubmittingSettlement(false);
    }
  };

  // Handle Payee Confirming settlement received
  const handleConfirmSettlementReceived = async (settlementId: string) => {
    setConfirmingSettlementId(settlementId);
    try {
      await confirmSettlement(settlementId);
      await refreshFinances();
    } catch (err) {
      console.error('[finances] failed to confirm repayment', err);
      toast.error(err instanceof Error ? err.message : 'Failed to confirm repayment');
    } finally {
      setConfirmingSettlementId(null);
    }
  };

  // Handle Rejecting / Deleting a settlement
  const handleDeleteSettlement = async (settlementId: string) => {
    setConfirmingSettlementId(settlementId);
    try {
      await deleteSettlement(settlementId);
      await refreshFinances();
    } catch (err) {
      console.error('[finances] failed to delete/reject settlement', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete/reject settlement');
    } finally {
      setConfirmingSettlementId(null);
    }
  };

  // Handle Updating the Trip Budget
  const handleUpdateBudgetSubmit = async (amount: number) => {
    if (!id) return;
    setIsSubmittingBudget(true);
    try {
      await updateBudget({
        tripId: id,
        amount,
      });
      await refreshFinances();
      setBudgetOpen(false);
    } catch (err) {
      console.error('[finances] failed to update budget', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update budget');
    } finally {
      setIsSubmittingBudget(false);
    }
  };

  // Handle Saving Payment Receiving details
  const handleSavePaymentDetailsSubmit = async (details: SavePaymentDetailsPayload) => {
    setIsSubmittingPayment(true);
    try {
      await savePaymentDetails(details);
      await refreshFinances();
      setPaymentOpen(false);
    } catch (err) {
      console.error('[finances] failed to save payment details', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save payment details');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleSettleUpTrigger = (payee: DebtRelation, isCentralFund?: boolean) => {
    setActiveSettlePayee(payee);
    setDefaultIsCentralFund(isCentralFund ?? false);
    setSettleOpen(true);
  };

  const isTreasurer = user?.id === finances?.summary?.treasurerId;
  const centralFundPerPerson = finances?.summary?.centralFundPerPerson || 0;
  const treasurerId = finances?.summary?.treasurerId;

  // Check user's paid amount for central fund
  const userCentralSettlements =
    finances?.settlements?.filter(
      (s) => s.payer_id === user?.id && s.is_central_fund && s.payee_id === treasurerId,
    ) ?? [];

  const userCentralPaidAndPending = userCentralSettlements.reduce(
    (sum: number, s) => sum + s.amount,
    0,
  );
  const hasFullyPaidCentralFund =
    centralFundPerPerson > 0 && userCentralPaidAndPending >= centralFundPerPerson;
  const remainingCentralContribution = Math.max(
    0,
    centralFundPerPerson - userCentralPaidAndPending,
  );

  const handlePayContribution = () => {
    if (!treasurerId || !centralFundPerPerson) return;
    const treasurerMember = trip?.members.find((m) => m.userId === treasurerId);
    if (treasurerMember) {
      handleSettleUpTrigger(
        {
          userId: treasurerMember.userId,
          name: treasurerMember.name,
          avatarUrl: treasurerMember.avatarUrl,
          amount: remainingCentralContribution,
        },
        true,
      );
    }
  };

  // Dynamic header settings configuration mapping based on activeTab
  const TABS_SETTING_HEADERS: Record<
    TabId,
    { title: string; subtitle: React.ReactNode; actions: React.ReactNode }
  > = {
    all: {
      title: t('finances.title'),
      subtitle: trip ? (
        <Trans
          i18nKey="finances.managingCostsFor"
          values={{
            title: trip.title,
            range: formatLocalizedDateRange(trip.startsOn, trip.endsOn, i18n.language).range,
          }}
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
                  : 'text-muted-foreground hover:text-foreground',
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
                  : 'text-muted-foreground hover:text-foreground',
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
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            {isOptimized ? t('finances.optimizedActive') : t('finances.enableOptimization')}
          </button>
        </div>
      ),
    },
    'central-fund': {
      title: t('finances.centralFund.title', 'Central Fund'),
      subtitle: t('finances.centralFund.manageCommonExpenses', 'Manage common expenses'),
      actions: (
        <>
          {treasurerId && centralFundPerPerson > 0 && !isTreasurer && !hasFullyPaidCentralFund && (
            <Button
              onClick={handlePayContribution}
              className="gap-2 shadow-sm hover:shadow-md transition-all animate-in fade-in duration-300 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl h-10 px-4 text-xs shrink-0"
            >
              <CreditCard className="w-4 h-4" />
              {t('finances.centralFund.payContribution', 'Pay Contribution (฿{{amount}})', {
                amount: remainingCentralContribution.toLocaleString(),
              })}
            </Button>
          )}
        </>
      ),
    },
  };

  const headerConfig = TABS_SETTING_HEADERS[activeTab] || TABS_SETTING_HEADERS.all;

  // While trip/finances are loading they are null, but the context is only ever
  // read by the children rendered below the `!trip || !finances` guard, so the
  // non-null contract on TripFinancesContextType holds for every consumer.
  const contextValue = {
    trip: trip!,
    finances: finances!,
    user,
    isLoading,
    isOptimized: queryOptimized,
    setIsOptimized,
    confirmingSettlementId,
    handleConfirmSettlementReceived,
    handleDeleteSettlement,
    handleSettleUpTrigger,
    setBudgetOpen,
    refreshFinances,
  } satisfies TripFinancesContextType;

  return (
    <TripFinancesContext.Provider value={contextValue}>
      <div className="mx-auto flex max-w-6xl flex-col gap-8 h-full overflow-hidden animate-in fade-in duration-300">
        <PageHeader
          backTo={`/trips/${id}`}
          backLabel={t('overview.tripOverview')}
          title={headerConfig.title}
          subtitle={headerConfig.subtitle}
          actions={headerConfig.actions}
        />

        <div className="flex flex-col flex-1 min-h-0 space-y-6">
          {/* 2. Tabs Selector */}
          <div className="border-border flex items-center justify-between gap-3 border-b shrink-0">
            <div
              className="flex gap-2 overflow-x-auto scrollbar-none"
              role="tablist"
              aria-label="Finances view"
            >
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
              ) : activeTab === 'central-fund' ? (
                <CentralFundSkeleton />
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
          {trip && finances && (
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
                  onVerified={(silent) => refreshFinances(silent)}
                  defaultIsCentralFund={defaultIsCentralFund}
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
