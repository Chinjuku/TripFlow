import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, CreditCard, AlertCircle } from 'lucide-react';
import { Button } from '@trip-flow/ui/components/button';
import { Skeleton } from '@trip-flow/ui/components/skeleton';
import { useTrip, formatDateRange } from '@/features/trips';
import { useAuth } from '@/features/auth/useAuth';

// Finances Feature Components & Hooks
import {
  useTripFinances,
  createExpense,
  createSettlement,
  confirmSettlement,
  updateBudget,
  savePaymentDetails,
  ExpenseSummary,
  ExpenseList,
  CreateExpenseModal,
  SettleUpModal,
  BudgetModal,
  PaymentDetailsModal,
  type DebtRelation,
} from '@/features/finances';

export default function TripFinancesPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

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
        <Link
          to="/trips"
          className="text-muted-foreground hover:text-primary mb-6 inline-flex items-center gap-2 text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All trips
        </Link>
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

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      {/* 1. Header with dynamic trip overview info */}
      <div className="border-border flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link
            to="/trips"
            className="text-muted-foreground hover:text-primary mb-2 inline-flex items-center gap-2 text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All trips
          </Link>
          <h1 className="text-foreground font-headline text-3xl font-extrabold tracking-tight">
            Trip Finances
          </h1>
          {trip ? (
            <p className="text-muted-foreground text-sm">
              Managing costs for <b>{trip.title}</b> (
              {formatDateRange(trip.startsOn, trip.endsOn).range})
            </p>
          ) : (
            <Skeleton className="h-4 w-48" />
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => setPaymentOpen(true)}
            className="gap-2 text-xs font-bold rounded-xl border border-border transition-colors h-10"
          >
            <CreditCard className="h-4 w-4" />
            Your QR & Payment Details
          </Button>

          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-2 rounded-full shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] h-10 shrink-0 px-6"
          >
            <Plus className="h-4 w-4" />
            Record Expense
          </Button>
        </div>
      </div>

      {/* Error alert toast */}
      {errorMsg && (
        <div className="border-rose-100 bg-rose-50 text-rose-800 p-4 rounded-xl border text-xs flex items-center gap-2 dark:bg-rose-950/20 dark:border-rose-950/30 dark:text-rose-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Skeletons while loading */}
      {isLoading || !trip || !finances ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-44 rounded-2xl" />
            ))}
          </div>
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in-0 duration-300">
          {/* 2. Expense Summary Cards */}
          <ExpenseSummary
            summary={finances.summary}
            members={trip.members}
            onSettleUp={handleSettleUpTrigger}
            onSetBudget={() => setBudgetOpen(true)}
            isOptimized={isOptimized}
            onToggleOptimize={() => setIsOptimized(!isOptimized)}
          />

          {/* 3. Recent Activity Feed */}
          <ExpenseList
            expenses={finances.expenses}
            settlements={finances.settlements}
            currentUserId={user?.id || ''}
            onConfirmSettlement={handleConfirmSettlementReceived}
            confirmingId={confirmingSettlementId}
            seeAllLink={`/trips/${id}/all-expense`}
          />

          {/* Modals & Forms */}
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
        </div>
      )}
    </div>
  );
}
