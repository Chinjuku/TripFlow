import React, { useMemo } from 'react';
import { TripFinancesLayout, useTripFinancesContext } from '@/components/feat/finances';
import { CentralFundCard } from '@/components/feat/finances/central-fund/CentralFundCard';
import { CentralFundMembers } from '@/components/feat/finances/central-fund/CentralFundMembers';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function TripCentralFundPage() {
  return (
    <TripFinancesLayout activeTab="central-fund">
      <TripCentralFundContent />
    </TripFinancesLayout>
  );
}

function TripCentralFundContent() {
  const { trip, finances, user, handleSettleUpTrigger, refreshFinances } = useTripFinancesContext();
  const { t, i18n } = useTranslation();

  const { summary, expenses, settlements } = finances;
  const isOwner = user?.id === trip.ownerId;
  const isTreasurer = user?.id === summary.treasurerId;

  // Filter and format activities
  const activities = useMemo(() => {
    const centralExpenses = expenses
      .filter((e: any) => e.is_central_fund)
      .map((e: any) => ({
        id: e.id,
        type: 'expense' as const,
        title: e.description || t('finances.centralFund.defaultExpense', 'Central Fund Expense'),
        amount: e.amount,
        date: new Date(e.expense_date || e.created_at),
        user: e.payerName,
        avatarUrl: e.payerAvatarUrl,
      }));

    const centralSettlements = settlements
      .filter((s: any) => s.is_central_fund)
      .map((s: any) => ({
        id: s.id,
        type: 'settlement' as const,
        title: t('finances.centralFund.contribution', 'Contribution'),
        amount: s.amount,
        date: new Date(s.created_at),
        user: s.payerName,
        avatarUrl: s.payerAvatarUrl,
        status: s.status,
      }));

    return [...centralExpenses, ...centralSettlements].sort(
      (a, b) => b.date.getTime() - a.date.getTime(),
    );
  }, [expenses, settlements, t]);

  return (
    <div className="flex flex-col flex-1 overflow-y-auto lg:overflow-hidden gap-6 h-full min-h-0">
      <div className="shrink-0 space-y-4">
        <CentralFundCard
          tripId={trip.id}
          summary={summary}
          members={trip.members}
          isOwner={isOwner}
          onRefresh={refreshFinances}
        />
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 flex-1 min-h-0 lg:overflow-hidden pb-6 lg:pb-0">
        {/* Left Column: Member Contributions */}
        <div className="shrink-0 lg:flex lg:flex-col lg:min-h-0 lg:overflow-y-auto lg:pr-2 lg:pb-4">
          {summary.treasurerId && summary.centralFundPerPerson != null && summary.centralFundTotal > 0 && (
            <CentralFundMembers
              members={trip.members}
              treasurerId={summary.treasurerId}
              centralFundPerPerson={summary.centralFundPerPerson}
              settlements={settlements}
              expenses={expenses}
            />
          )}
        </div>

        {/* Right Column: Activity Log */}
        <div className="shrink-0 lg:flex-1 lg:flex lg:flex-col lg:min-h-0 lg:overflow-y-auto lg:pr-2 lg:pb-4 space-y-4">
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
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${act.type === 'expense' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'}`}
                  >
                    {act.type === 'expense' ? (
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
                <div
                  className={`font-bold shrink-0 text-right ${act.type === 'expense' ? 'text-rose-600' : 'text-emerald-600'}`}
                >
                  {act.type === 'expense' ? '-' : '+'}฿
                  {act.amount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
