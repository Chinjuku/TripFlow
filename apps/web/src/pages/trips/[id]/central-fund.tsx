import React, { useMemo, useState } from 'react';
import { 
  TripFinancesLayout, 
  useTripFinancesContext,
  CentralFundCard,
  CentralFundMembers,
  PayCentralFundModal,
  RequestReimbursementModal,
  createExpense,
  createSettlement,
  type CreateExpensePayload,
} from '@/components/feat/finances';
import { TrendingDown, TrendingUp, HandCoins, Receipt, Wallet, CheckCircle2, Circle, Clock, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

export default function TripCentralFundPage() {
  return (
    <TripFinancesLayout activeTab="central-fund">
      <TripCentralFundContent />
    </TripFinancesLayout>
  );
}

function TripCentralFundContent() {
  const {
    trip,
    finances,
    user,
    handleSettleUpTrigger,
    refreshFinances,
    confirmingSettlementId,
    handleConfirmSettlementReceived,
    handleDeleteSettlement,
  } = useTripFinancesContext();
  const { t, i18n } = useTranslation();

  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { summary, expenses, settlements } = finances;
  const isOwner = user?.id === trip.ownerId;
  const isTreasurer = user?.id === summary.treasurerId;

  // Filter and format activities
  const activities = useMemo(() => {
    const centralExpenses = expenses
      .filter((e) => e.is_central_fund)
      .map((e) => ({
        id: e.id,
        type: 'expense' as const,
        title: e.description || t('finances.centralFund.defaultExpense', 'Central Fund Expense'),
        amount: e.amount,
        date: new Date(e.expense_date || e.created_at),
        user: e.payerName,
        avatarUrl: e.payerAvatarUrl,
        paidById: e.paid_by_id,
        splits: e.splits,
        isNegative: true, // Expenses are always negative (cost/outflow)
      }));

    const centralSettlements = settlements
      .filter((s) => s.is_central_fund)
      .map((s) => {
        const isReimbursement = s.payer_id === summary.treasurerId;
        
        let isNegative = false;
        if (isTreasurer) {
          // Treasurer: reimbursement is outflow (-), contribution is inflow (+)
          isNegative = isReimbursement;
        } else {
          // Member: reimbursement is inflow (+), contribution is outflow (-)
          isNegative = !isReimbursement;
        }

        return {
          id: s.id,
          type: 'settlement' as const,
          title: isReimbursement
            ? t('finances.centralFund.reimbursement', 'Reimbursement')
            : t('finances.centralFund.contribution', 'Contribution'),
          amount: s.amount,
          date: new Date(s.created_at),
          user: isReimbursement ? s.payeeName : s.payerName,
          avatarUrl: isReimbursement ? s.payeeAvatarUrl : s.payerAvatarUrl,
          status: s.status,
          payeeId: s.payee_id,
          payerId: s.payer_id,
          isNegative,
        };
      });

    const all = [...centralExpenses, ...centralSettlements];

    const filtered = isTreasurer
      ? all
      : all.filter((act) => {
          if (act.type === 'expense') {
            return (
              act.paidById === user?.id ||
              act.splits?.some((split) => split.user_id === user?.id)
            );
          } else {
            return act.payerId === user?.id || act.payeeId === user?.id;
          }
        });

    return filtered.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [expenses, settlements, isTreasurer, user?.id, t]);

  const pendingCentralSettlements = useMemo(() => {
    return settlements.filter(
      (s) => s.is_central_fund && s.status === 'pending' && (s.payee_id === user?.id || s.payer_id === user?.id)
    );
  }, [settlements, user?.id]);

  const myContribution = useMemo(() => {
    if (!user?.id || isTreasurer) return null;

    const mySettlements = settlements.filter(
      (s) => s.payer_id === user?.id && s.is_central_fund && s.payee_id === summary.treasurerId
    );

    const paidAmount = mySettlements
      .filter((s) => s.status === 'completed')
      .reduce((sum, s) => sum + s.amount, 0);

    const pendingAmount = mySettlements
      .filter((s) => s.status === 'pending')
      .reduce((sum, s) => sum + s.amount, 0);

    const required = summary.centralFundPerPerson || 0;

    const centralFundSettlementsSpent = settlements
      .filter(
        (s) =>
          s.is_central_fund &&
          s.status === 'completed' &&
          s.payer_id === summary.treasurerId
      )
      .reduce((sum, s) => sum + s.amount, 0);

    const spentAmount =
      expenses
        .filter((e) => e.is_central_fund)
        .reduce((sum, e) => {
          const split = e.splits.find((s) => s.user_id === user?.id);
          return sum + (split ? split.amount : 0);
        }, 0) + (trip.members.length > 0 ? centralFundSettlementsSpent / trip.members.length : 0);

    let status: 'paid' | 'pending' | 'unpaid' = 'unpaid';
    if (paidAmount >= required) {
      status = 'paid';
    } else if (paidAmount + pendingAmount >= required) {
      status = 'pending';
    } else if (paidAmount > 0 || pendingAmount > 0) {
      status = 'pending';
    }

    return {
      paidAmount,
      pendingAmount,
      required,
      status,
      spentAmount,
    };
  }, [settlements, expenses, user?.id, isTreasurer, summary.treasurerId, summary.centralFundPerPerson]);

  const remainingCentralFund = summary.centralFundTotal - summary.centralFundSpent;

  const hasContributions = useMemo(() => {
    return settlements.some(
      (s) => s.is_central_fund && s.payee_id === summary.treasurerId
    );
  }, [settlements, summary.treasurerId]);

  const handlePayCentralFundSubmit = async (values: Omit<CreateExpensePayload, 'tripId'>) => {
    setIsSubmitting(true);
    try {
      await createExpense({ ...values, tripId: trip.id });
      await refreshFinances();
    } catch (err) {
      console.error('Failed to record central fund expense', err);
      alert(err instanceof Error ? err.message : 'Failed to record expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestReimbursementSubmit = async (amount: number) => {
    if (!user || !summary.treasurerId) return;
    setIsSubmitting(true);
    try {
      await createSettlement({
        tripId: trip.id,
        payeeId: user.id,
        payerId: summary.treasurerId,
        amount,
        isCentralFund: true,
      });
      await refreshFinances();
    } catch (err) {
      console.error('Failed to request reimbursement', err);
      alert(err instanceof Error ? err.message : 'Failed to request reimbursement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasCentralFund = Boolean(
    summary.treasurerId && 
    summary.centralFundPerPerson && 
    summary.centralFundPerPerson > 0
  );

  return (
    <div className="flex flex-col flex-1 overflow-y-auto lg:overflow-hidden gap-6 h-full min-h-0">
      {hasCentralFund && (
        <div className="shrink-0 flex items-center justify-between gap-3 bg-muted/40 p-4 rounded-2xl border border-border">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              {t('finances.centralFund.actionsTitle', 'Central Fund Actions')}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t('finances.centralFund.actionsDesc', 'Manage expenses or request reimbursements from the central fund pool.')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isTreasurer ? (
              <Button
                onClick={() => setIsPayModalOpen(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-2 rounded-xl shadow-sm transition-colors"
              >
                <Receipt className="w-4 h-4" />
                {t('finances.centralFund.payAction', 'Pay from Central Fund')}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => setIsRequestModalOpen(true)}
                disabled={!summary.treasurerId}
                className="gap-2 font-bold rounded-xl border border-border hover:bg-muted"
              >
                <HandCoins className="w-4 h-4" />
                {t('finances.centralFund.requestAction', 'Request Reimbursement')}
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="shrink-0 space-y-4">
        <CentralFundCard
          tripId={trip.id}
          summary={summary}
          members={trip.members}
          isOwner={isOwner}
          currentUserId={user?.id || ''}
          hasContributions={hasContributions}
          onRefresh={refreshFinances}
        />
      </div>

      {isTreasurer && pendingCentralSettlements.length > 0 && (
        <div className="shrink-0 bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-foreground font-headline uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            {t('finances.centralFund.pendingApprovals', 'Pending Approvals')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingCentralSettlements.map((set) => {
              const isReimbursement = set.payer_id === user?.id;
              const name = isReimbursement ? set.payeeName : set.payerName;
              const avatarUrl = isReimbursement ? set.payeeAvatarUrl : set.payerAvatarUrl;
              const label = isReimbursement
                ? t('finances.centralFund.reimbursement', 'Reimbursement')
                : t('finances.centralFund.contribution', 'Contribution');
              const btnLabel = confirmingSettlementId === set.id
                ? t('finances.confirming', 'Confirming...')
                : isReimbursement
                ? t('finances.centralFund.confirmPayment', 'Confirm Payment')
                : t('finances.centralFund.confirmReceipt', 'Confirm Receipt');

              return (
                <div
                  key={set.id}
                  className="flex items-center justify-between p-4 bg-muted/35 border border-border rounded-2xl shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={name}
                        className="w-10 h-10 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0 text-sm">
                        {name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-sm text-foreground">
                        {name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {label} • {new Intl.DateTimeFormat(i18n.language.startsWith('th') ? 'th-TH' : 'en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        }).format(new Date(set.created_at))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="font-extrabold text-sm text-foreground font-headline block">
                        ฿{set.amount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        disabled={confirmingSettlementId === set.id}
                        onClick={async () => {
                          if (confirm(t('finances.centralFund.confirmReject', 'Are you sure you want to reject this request?'))) {
                            await handleDeleteSettlement?.(set.id);
                          }
                        }}
                        className="border-destructive/30 hover:bg-destructive/10 hover:text-destructive text-destructive font-bold text-xs px-3 py-1.5 h-auto rounded-xl transition-all font-label"
                      >
                        {t('finances.centralFund.reject', 'Reject')}
                      </Button>
                      <Button
                        disabled={confirmingSettlementId === set.id}
                        onClick={() => handleConfirmSettlementReceived?.(set.id)}
                        className="bg-primary hover:bg-primary/80 text-primary-foreground font-bold text-xs px-3 py-1.5 h-auto rounded-xl shadow-sm transition-all font-label"
                      >
                        {btnLabel}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className={isTreasurer ? "flex flex-col lg:grid lg:grid-cols-2 gap-6 flex-1 min-h-0 lg:overflow-hidden pb-6 lg:pb-0" : "flex flex-col gap-6 flex-1 min-h-0 overflow-y-auto pb-6"}>
        {/* Left Column / Top Section: Member Contributions or Personal Status */}
        {isTreasurer ? (
          <div className="shrink-0 lg:flex lg:flex-col lg:min-h-0 lg:overflow-y-auto lg:pr-2 lg:pb-4">
            {summary.treasurerId && summary.centralFundPerPerson != null && summary.centralFundTotal > 0 && (
              <CentralFundMembers
                members={trip.members}
                treasurerId={summary.treasurerId}
                centralFundPerPerson={summary.centralFundPerPerson}
                settlements={settlements}
              />
            )}
          </div>
        ) : (
          summary.treasurerId && summary.centralFundPerPerson != null && summary.centralFundTotal > 0 && myContribution && (
            <div className="shrink-0">
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-foreground font-headline uppercase tracking-wider">
                        {t('finances.centralFund.yourContribution', 'Your Contribution')}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {myContribution.status === 'paid' && t('finances.centralFund.fullyPaid', 'You have fully paid your share.')}
                        {myContribution.status === 'pending' && t('finances.centralFund.pendingConfirmation', 'Waiting for treasurer to confirm receipt.')}
                        {myContribution.status === 'unpaid' && t('finances.centralFund.pleasePay', 'Please pay your contribution to the treasurer.')}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {myContribution.status === 'paid' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 text-xs font-bold rounded-xl tracking-wider">
                        <CheckCircle2 className="w-4 h-4" />
                        {t('finances.centralFund.paid', 'PAID')}
                      </span>
                    ) : myContribution.status === 'pending' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 text-xs font-bold rounded-xl tracking-wider">
                        <Clock className="w-4 h-4 animate-pulse" />
                        {t('finances.pending', 'PENDING')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted text-muted-foreground text-xs font-bold rounded-xl tracking-wider">
                        <Circle className="w-4 h-4" />
                        {t('finances.centralFund.unpaid', 'UNPAID')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 border-t border-border/60">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                      {t('finances.centralFund.amountPaid', 'Paid Amount')}
                    </div>
                    <div className="text-lg font-extrabold text-foreground font-headline mt-0.5">
                      ฿{myContribution.paidAmount.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                      {t('finances.centralFund.requiredAmount', 'Required')}
                    </div>
                    <div className="text-lg font-extrabold text-foreground font-headline mt-0.5">
                      ฿{myContribution.required.toLocaleString()}
                    </div>
                  </div>
                  {myContribution.spentAmount > 0 && (
                    <div className="col-span-2 sm:col-span-1">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                        {t('finances.centralFund.yourSpending', 'Spent from Fund')}
                      </div>
                      <div className="text-lg font-extrabold text-rose-500 font-headline mt-0.5">
                        ฿{myContribution.spentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        )}

        {/* Right Column / Flow Item: Activity Log */}
        {hasCentralFund && (
          <div className={isTreasurer ? "shrink-0 lg:flex-1 lg:flex lg:flex-col lg:min-h-0 lg:overflow-y-auto lg:pr-2 lg:pb-4 space-y-4" : "space-y-4 pb-4"}>
            <h3 className="shrink-0 text-sm font-bold text-foreground font-headline uppercase tracking-wider">
              {t('finances.centralFund.activityLog', 'Activity Log')}
            </h3>

            {activities.length === 0 ? (
              <div className="flex items-center justify-center text-center text-muted-foreground text-xs py-10 bg-muted/30 rounded-2xl border border-border">
                {t('finances.centralFund.noActivity', 'No central fund activity yet.')}
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-center justify-between p-4 bg-card border border-border rounded-2xl shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${act.isNegative ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'}`}
                      >
                        {act.isNegative ? (
                          <TrendingDown className="w-5 h-5" />
                        ) : (
                          <TrendingUp className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-foreground truncate">
                          {act.title}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <div className="flex items-center gap-1">
                            {act.avatarUrl ? (
                              <img
                                src={act.avatarUrl}
                                alt={act.user}
                                className="w-4 h-4 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-bold text-primary shrink-0">
                                {act.user.charAt(0)}
                              </div>
                            )}
                            <span className="truncate max-w-[80px] sm:max-w-[120px]">{act.user}</span>
                          </div>
                          <span className="text-[10px] opacity-50">•</span>
                          <span className="shrink-0">
                            {new Intl.DateTimeFormat(i18n.language.startsWith('th') ? 'th-TH' : 'en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false,
                            }).format(act.date)}
                          </span>
                          {act.type === 'settlement' && act.status === 'pending' && (
                            <span className="ml-1 text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold tracking-wider shrink-0">
                              {t('finances.pending', 'PENDING').toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div
                        className={`font-bold text-right ${act.isNegative ? 'text-rose-600' : 'text-emerald-600'}`}
                      >
                        {act.isNegative ? '-' : '+'}฿
                        {act.amount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      {isTreasurer && act.type === 'settlement' && (
                        <button
                          disabled={confirmingSettlementId === act.id}
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (confirm(t('finances.centralFund.confirmDeleteSettlement', 'Are you sure you want to delete/undo this transaction?'))) {
                              await handleDeleteSettlement?.(act.id);
                            }
                          }}
                          className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title={t('finances.delete', 'Delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {isPayModalOpen && summary.treasurerId && (
        <PayCentralFundModal
          open={isPayModalOpen}
          onOpenChange={setIsPayModalOpen}
          members={trip.members}
          treasurerId={summary.treasurerId}
          remainingCentralFund={remainingCentralFund}
          onSubmit={handlePayCentralFundSubmit}
          isSubmitting={isSubmitting}
        />
      )}

      {isRequestModalOpen && (
        <RequestReimbursementModal
          open={isRequestModalOpen}
          onOpenChange={setIsRequestModalOpen}
          remainingCentralFund={remainingCentralFund}
          onSubmit={handleRequestReimbursementSubmit}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
