import {
  TripFinancesLayout,
  useTripFinancesContext,
} from '@/components/feat/finances/components/TripFinancesLayout';
import { ExpenseSummary, ExpenseList } from '@/components/feat/finances';

export default function TripFinancesPage() {
  return (
    <TripFinancesLayout activeTab="all">
      <TripFinancesAllContent />
    </TripFinancesLayout>
  );
}

function TripFinancesAllContent() {
  const {
    trip,
    finances,
    user,
    isOptimized,
    setIsOptimized,
    confirmingSettlementId,
    handleConfirmSettlementReceived,
    handleSettleUpTrigger,
    setBudgetOpen,
  } = useTripFinancesContext();

  return (
    <div className="flex flex-col flex-1 overflow-hidden gap-6 h-full min-h-0">
      {/* 2. Expense Summary Cards */}
      <div className="shrink-0">
        <ExpenseSummary
          summary={finances.summary}
          members={trip.members}
          onSettleUp={handleSettleUpTrigger}
          onSetBudget={() => setBudgetOpen(true)}
          isOptimized={isOptimized}
          onToggleOptimize={() => setIsOptimized(!isOptimized)}
        />
      </div>

      {/* 3. Recent Activity Feed */}
      <div className="flex-1 overflow-y-auto pr-2 min-h-0">
        <ExpenseList
          expenses={finances.expenses}
          settlements={finances.settlements}
          currentUserId={user?.id || ''}
          onConfirmSettlement={handleConfirmSettlementReceived}
          confirmingId={confirmingSettlementId}
        />
      </div>
    </div>
  );
}
