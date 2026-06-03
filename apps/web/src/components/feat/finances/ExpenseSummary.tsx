import React from 'react';
import { useTranslation } from 'react-i18next';
import { Wallet, ArrowDownLeft, ArrowUpRight, Plus, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@trip-flow/ui/components/card';
import { Button } from '@trip-flow/ui/components/button';
import type { FinanceSummary, DebtRelation } from './types';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ExpenseSummaryProps {
  summary: FinanceSummary;
  members: { userId: string; name: string; avatarUrl: string | null }[];
  onSettleUp: (payee: DebtRelation) => void;
  onSetBudget: () => void;
  isOptimized: boolean;
  onToggleOptimize: () => void;
  tripOwnerId: string;
  onRefresh: () => void;
}

export function ExpenseSummary({
  summary,
  members,
  onSettleUp,
  onSetBudget,
  isOptimized,
  onToggleOptimize,
  tripOwnerId,
  onRefresh,
}: ExpenseSummaryProps) {
  const {
    totalGroupCost,
    userShare,
    totalOwedToUser,
    totalUserOwes,
    whoOwesYou,
    whatYouOwe,
    budget,
  } = summary;
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  
  // Trip owner is determined from trip data, but since we don't have it directly in summary,
  // wait, members array might have a 'role' or we can pass `isOwner` from parent.
  // We'll pass `isOwner` from parent to ExpenseSummary. Let's add it to props.

  // Calculate budget progress
  const budgetAmount = budget?.amount ?? 0;
  const progressPercent =
    budgetAmount > 0 ? Math.min(100, Math.round((totalGroupCost / budgetAmount) * 100)) : 0;
  const formattedBudget = budgetAmount > 0 ? `฿${(budgetAmount / 1000).toFixed(1)}k` : '';

  return (
    <div className="space-y-6">
      {/* Main 3-Card Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: Total Group Cost */}
        <Card className="rounded-2xl border-border bg-card shadow-sm overflow-hidden relative group transition-all duration-300 hover:shadow-md">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-110 transition-transform duration-300">
            <Wallet className="w-32 h-32 text-foreground" />
          </div>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-bold tracking-wider uppercase font-label">
              <Wallet className="h-4 w-4" />
              {t('finances.totalGroupCost')}
            </div>

            <div className="space-y-1">
              <div className="font-headline text-foreground text-3xl font-extrabold sm:text-4xl">
                ฿
                {totalGroupCost.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <div className="text-muted-foreground text-sm">
                {t('finances.yourShare')}: ฿
                {userShare.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>

            {/* Budget Progress Bar */}
            <div className="space-y-2 pt-2">
              <div className="bg-muted h-2.5 w-full rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${budgetAmount > 0 ? progressPercent : 0}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-primary font-semibold">
                  {budgetAmount > 0
                    ? `${progressPercent}% of ${formattedBudget} budget`
                    : t('finances.noBudgetSetYet')}
                </span>
                <button
                  onClick={onSetBudget}
                  className="text-primary hover:text-primary/80 font-medium hover:underline focus:outline-none transition-colors"
                >
                  {budgetAmount > 0 ? t('finances.editBudget') : t('finances.setBudget')}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Who Owes You */}
        <Card className="rounded-2xl border-primary/10 bg-gradient-to-b from-primary/[0.03] to-primary/[0.08] shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md dark:border-primary/20 dark:from-primary/[0.01] dark:to-primary/[0.04] bg-card">
          <CardContent className="p-6 flex flex-col h-full min-h-[14rem]">
            <Link
              className="flex items-center gap-2 bg-primary text-primary-foreground text-[10px] font-bold tracking-wider uppercase hover:bg-primary/90 px-4 py-2 rounded-full transition-all w-fit shadow-md border border-primary/20 active:scale-95 font-label"
              to={`/trips/${id}/to-receive`}
            >
              <ArrowDownLeft className="h-4 w-4" />
              {t('finances.whoOwesYou')}
            </Link>

            <div className="font-headline text-primary text-3xl font-extrabold sm:text-4xl mt-3 mb-4">
              ฿
              {totalOwedToUser.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>

            {whoOwesYou.length === 0 ? (
              <div className="text-muted-foreground flex-1 flex items-center justify-center text-center text-xs px-4">
                {t('finances.noOneOwesYou')}
              </div>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[12rem] pr-1">
                {whoOwesYou.map((debt: DebtRelation) => (
                  <div
                    key={debt.userId}
                    className="flex items-center justify-between py-1 border-b border-primary/10 last:border-0 dark:border-primary/20"
                  >
                    <div className="flex items-center gap-2.5">
                      {debt.avatarUrl ? (
                        <img
                          src={debt.avatarUrl}
                          alt={debt.name}
                          className="w-7 h-7 rounded-full object-cover shadow-sm"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs dark:bg-primary/20 dark:text-primary">
                          {debt.name.charAt(0)}
                        </div>
                      )}
                      <span className="text-foreground text-xs font-semibold">{debt.name}</span>
                    </div>
                    <span className="text-primary text-xs font-bold">
                      +฿{debt.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 3: What You Owe */}
        <Card className="rounded-2xl border-destructive/15 bg-gradient-to-b from-destructive/[0.03] to-destructive/[0.08] shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md dark:border-destructive/20 dark:from-destructive/[0.01] dark:to-destructive/[0.04] bg-card">
          <CardContent className="p-6 flex flex-col h-full min-h-[14rem]">
            <Link
              className="flex items-center gap-2 bg-destructive text-destructive-foreground text-[10px] font-bold tracking-wider uppercase hover:bg-destructive/90 px-4 py-2 rounded-full transition-all w-fit shadow-md border border-destructive/20 active:scale-95 font-label"
              to={`/trips/${id}/to-pay`}
            >
              <ArrowUpRight className="h-4 w-4" />
              {t('finances.whatYouOwe')}
            </Link>

            <div className="font-headline text-destructive text-3xl font-extrabold sm:text-4xl mt-3 mb-4">
              ฿
              {totalUserOwes.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>

            {whatYouOwe.length === 0 ? (
              <div className="text-muted-foreground flex-1 flex items-center justify-center text-center text-xs px-4">
                {t('finances.youDoNotOweAnyone')}
              </div>
            ) : (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3 overflow-y-auto max-h-[10rem] pr-1">
                  {whatYouOwe.map((debt: DebtRelation) => (
                    <div
                      key={debt.userId}
                      className="flex items-center justify-between py-1 border-b border-destructive/10 last:border-0 dark:border-destructive/20"
                    >
                      <div className="flex items-center gap-2.5">
                        {debt.avatarUrl ? (
                          <img
                            src={debt.avatarUrl}
                            alt={debt.name}
                            className="w-7 h-7 rounded-full object-cover shadow-sm"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-destructive/10 text-destructive font-bold flex items-center justify-center text-xs dark:bg-destructive/20 dark:text-destructive-foreground">
                            {debt.name.charAt(0)}
                          </div>
                        )}
                        <span className="text-foreground text-xs font-semibold">{debt.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-destructive text-xs font-bold">
                          -฿{debt.amount.toFixed(2)}
                        </span>
                        <button
                          onClick={() => onSettleUp(debt)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-[10px] font-bold px-2 py-0.5 rounded transition-colors font-label"
                        >
                          {t('finances.settleUp')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
