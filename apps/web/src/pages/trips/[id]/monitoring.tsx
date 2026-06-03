import React from 'react';
import { useParams } from 'react-router-dom';
import { Wallet, AlertTriangle, TrendingUp, PieChart, Target, Users } from 'lucide-react';
import {
  TripFinancesLayout,
  useTripFinancesContext,
} from '@/components/feat/finances/TripFinancesLayout';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@trip-flow/ui/components/card';
import type { HydratedExpense } from '@/components/feat/finances';

export default function TripFinancesMonitoringPage() {
  return (
    <TripFinancesLayout activeTab="monitoring">
      <TripFinancesMonitoringContent />
    </TripFinancesLayout>
  );
}

function TripFinancesMonitoringContent() {
  const { finances, trip } = useTripFinancesContext();
  const { t } = useTranslation();

  const totalCost = finances.summary.totalGroupCost;
  const budgetAmount = finances.summary.budget?.amount ?? 0;
  const memberCount = trip.members.length;
  const averageCost = memberCount > 0 ? totalCost / memberCount : 0;

  const progressPercent = budgetAmount > 0 ? (totalCost / budgetAmount) * 100 : 0;
  const isOverBudget = totalCost > budgetAmount && budgetAmount > 0;
  const remainingBudget = Math.max(0, budgetAmount - totalCost);

  const centralFundTotal = finances.summary.centralFundTotal;
  const centralFundSpent = finances.summary.centralFundSpent;
  const centralFundProgressPercent = centralFundTotal > 0 ? (centralFundSpent / centralFundTotal) * 100 : 0;
  const isCentralFundLow = centralFundSpent > centralFundTotal;

  // Group costs by category
  const categoryTotals: Record<string, number> = {};
  finances.expenses.forEach((exp: HydratedExpense) => {
    const cat = exp.category || 'other';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + exp.amount;
  });

  const categories = Object.entries(categoryTotals)
    .map(([name, val]) => ({
      name,
      amount: val,
      percent: totalCost > 0 ? (val / totalCost) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="flex flex-col flex-1 overflow-y-auto pr-2 pb-10 gap-6 h-full min-h-0 animate-in fade-in-0 duration-300 pt-4">
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Budget Status */}
        <Card className="rounded-2xl border-border bg-card shadow-sm overflow-hidden">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between text-muted-foreground text-[10px] font-bold tracking-wider uppercase font-label">
              <span className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                {t('finances.budgetLimit')}
              </span>
              {isOverBudget && (
                <span className="text-destructive font-bold flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {t('finances.overBudget')}
                </span>
              )}
            </div>
            <div className="space-y-1">
              <div className="font-headline text-foreground text-3xl font-extrabold sm:text-4xl">
                ฿
                {budgetAmount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className="text-muted-foreground text-xs font-semibold">
                {budgetAmount > 0
                  ? t('finances.budgetDescription', { percent: Math.round(progressPercent) })
                  : t('finances.noBudgetSetYet')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Remaining Budget */}
        <Card className="rounded-2xl border-border bg-card shadow-sm overflow-hidden">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center text-muted-foreground text-[10px] font-bold tracking-wider uppercase font-label gap-2">
              <Wallet className="h-4 w-4" />
              {t('finances.remainingBudget')}
            </div>
            <div className="space-y-1">
              <div
                className={`font-headline text-3xl font-extrabold sm:text-4xl ${isOverBudget ? 'text-destructive' : 'text-primary'}`}
              >
                ฿
                {remainingBudget.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className="text-muted-foreground text-xs font-semibold">
                {isOverBudget
                  ? t('finances.budgetDeficit', { amount: (totalCost - budgetAmount).toFixed(2) })
                  : t('finances.budgetSurplus', { amount: remainingBudget.toFixed(2) })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Per-Person Average */}
        <Card className="rounded-2xl border-border bg-card shadow-sm overflow-hidden">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center text-muted-foreground text-[10px] font-bold tracking-wider uppercase font-label gap-2">
              <Users className="h-4 w-4" />
              {t('finances.averagePerPerson')}
            </div>
            <div className="space-y-1">
              <div className="font-headline text-foreground text-3xl font-extrabold sm:text-4xl">
                ฿
                {averageCost.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className="text-muted-foreground text-xs font-semibold">
                {t('finances.averageDescription', { count: memberCount })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        {/* Budget Progress Meter */}
        <Card className="rounded-2xl border-border bg-card shadow-sm flex flex-col justify-between">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-headline font-bold text-foreground text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                {t('finances.budgetConsumption')}
              </h3>
            </div>

            <div className="space-y-6">
              {/* Central Fund Progress */}
              {centralFundTotal > 0 && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-muted-foreground font-label">
                    <span>{t('finances.centralFund.title', 'Central Fund')}</span>
                    <span className={isCentralFundLow ? 'text-destructive' : 'text-primary'}>
                      {Math.round(centralFundProgressPercent)}%
                    </span>
                  </div>
                  <div className="w-full bg-muted h-5 rounded-full overflow-hidden p-1 border border-border">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${isCentralFundLow ? 'bg-destructive' : 'bg-primary'}`}
                      style={{ width: `${Math.min(100, centralFundProgressPercent)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-extrabold text-muted-foreground uppercase font-label">
                    <span>{t('finances.spent', 'Spent')}: ฿{centralFundSpent.toLocaleString()}</span>
                    {isCentralFundLow && <span className="text-destructive font-bold">{t('finances.lowLiquidity', 'Low Liquidity!')}</span>}
                    <span>{t('finances.centralFund.totalPool', 'Pool')}: ฿{centralFundTotal.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Total Budget Progress */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs font-bold text-muted-foreground font-label">
                  <span>{t('finances.totalTripBudget', 'Total Trip Budget')}</span>
                  <span className={isOverBudget ? 'text-destructive' : ''}>
                    {Math.round(progressPercent)}%
                  </span>
                </div>
                <div className="w-full bg-muted h-5 rounded-full overflow-hidden p-1 border border-border">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${isOverBudget ? 'bg-destructive' : 'bg-muted-foreground'}`}
                    style={{ width: `${Math.min(100, progressPercent)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-extrabold text-muted-foreground uppercase font-label">
                  <span>{t('finances.spent', 'Spent')}: ฿{totalCost.toLocaleString()}</span>
                  <span>{t('finances.budgetLimit', 'Budget')}: ฿{budgetAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expenses by Category Breakdown */}
        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardContent className="p-6 space-y-6">
            <h3 className="font-headline font-bold text-foreground text-lg flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              {t('finances.categoryBreakdown')}
            </h3>

            <div className="space-y-4">
              {categories.length === 0 ? (
                <div className="text-muted-foreground text-xs py-10 text-center italic font-label">
                  {t('finances.noTransactionsYet')}
                </div>
              ) : (
                categories.map((cat) => (
                  <div key={cat.name} className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="capitalize text-foreground font-label">
                        {t(`finances.category.${cat.name}`, { defaultValue: cat.name })}
                      </span>
                      <span className="text-muted-foreground font-bold">
                        ฿{cat.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} (
                        {Math.round(cat.percent)}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full"
                        style={{ width: `${cat.percent}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
