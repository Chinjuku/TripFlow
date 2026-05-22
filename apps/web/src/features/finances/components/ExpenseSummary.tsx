import React from 'react';
import { Wallet, ArrowDownLeft, ArrowUpRight, Plus, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@trip-flow/ui/components/card';
import { Button } from '@trip-flow/ui/components/button';
import type { FinanceSummary, DebtRelation } from '../types';

interface ExpenseSummaryProps {
  summary: FinanceSummary;
  members: { userId: string; name: string; avatarUrl: string | null }[];
  onSettleUp: (payee: DebtRelation) => void;
  onSetBudget: () => void;
  isOptimized: boolean;
  onToggleOptimize: () => void;
}

export function ExpenseSummary({
  summary,
  members,
  onSettleUp,
  onSetBudget,
  isOptimized,
  onToggleOptimize,
}: ExpenseSummaryProps) {
  const { totalGroupCost, userShare, totalOwedToUser, totalUserOwes, whoOwesYou, whatYouOwe, budget } = summary;

  // Calculate budget progress
  const budgetAmount = budget?.amount ?? 0;
  const progressPercent = budgetAmount > 0 ? Math.min(100, Math.round((totalGroupCost / budgetAmount) * 100)) : 0;
  const formattedBudget = budgetAmount > 0 ? `$${(budgetAmount / 1000).toFixed(1)}k` : '';

  return (
    <div className="space-y-6">
      {/* Debt Optimization Toggle Panel */}
      {/* <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border-emerald-100/50 flex flex-col items-start justify-between gap-4 rounded-2xl border p-4 shadow-sm sm:flex-row sm:items-center dark:from-slate-900/40 dark:via-slate-900/20 dark:to-slate-900/30 dark:border-emerald-950/30">
        <div className="flex items-start gap-3">
          <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mt-0.5 rounded-full p-2">
            <Sparkles className="h-4 w-4 animate-pulse" />
          </div>
          <div>
            <h4 className="text-foreground text-sm font-semibold">Minimize Group Transactions (Debt Optimization)</h4>
            <p className="text-muted-foreground text-xs">
              Greedily calculates the most efficient repayment pathways to reduce overall transfers.
            </p>
          </div>
        </div>
        <button
          onClick={onToggleOptimize}
          className={`focus-visible:ring-ring text-xs font-semibold px-4 py-2 rounded-full border transition-all duration-300 ${
            isOptimized
              ? 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/15'
              : 'bg-white border-border text-foreground hover:bg-muted dark:bg-card'
          }`}
        >
          {isOptimized ? 'Optimization Active' : 'Enable Optimization'}
        </button>
      </div> */}

      {/* Main 3-Card Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: Total Group Cost */}
        <Card className="rounded-2xl border-border bg-white shadow-sm overflow-hidden relative group transition-all duration-300 hover:shadow-md dark:bg-card">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-110 transition-transform duration-300">
            <Wallet className="w-32 h-32 text-foreground" />
          </div>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
              <Wallet className="h-4 w-4" />
              Total Group Trip Cost
            </div>

            <div className="space-y-1">
              <div className="font-headline text-foreground text-3xl font-extrabold sm:text-4xl">
                ${totalGroupCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-muted-foreground text-sm">
                Your share: ${userShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            {/* Budget Progress Bar */}
            <div className="space-y-2 pt-2">
              <div className="bg-muted h-2.5 w-full rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${budgetAmount > 0 ? progressPercent : 0}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-emerald-700 font-semibold dark:text-emerald-400">
                  {budgetAmount > 0 ? `${progressPercent}% of ${formattedBudget} budget` : 'No budget set yet'}
                </span>
                <button
                  onClick={onSetBudget}
                  className="text-primary hover:text-primary/80 font-medium hover:underline focus:outline-none transition-colors"
                >
                  {budgetAmount > 0 ? 'Edit Budget' : 'Set Budget'}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Who Owes You */}
        <Card className="rounded-2xl border-blue-100 bg-gradient-to-b from-blue-50/30 to-blue-50/70 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md dark:border-blue-950/20 dark:from-slate-900/30 dark:to-slate-900/50 dark:bg-card">
          <CardContent className="p-6 flex flex-col h-full min-h-[14rem]">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 text-[10px] font-bold tracking-wider uppercase">
              <ArrowDownLeft className="h-4 w-4" />
              Who owes you
            </div>

            <div className="font-headline text-blue-800 dark:text-blue-300 text-3xl font-extrabold sm:text-4xl mt-3 mb-4">
              ${totalOwedToUser.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>

            {whoOwesYou.length === 0 ? (
              <div className="text-muted-foreground flex-1 flex items-center justify-center text-center text-xs px-4">
                No one owes you money right now. Happy travels!
              </div>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[8rem] pr-1">
                {whoOwesYou.map((debt: DebtRelation) => (
                  <div key={debt.userId} className="flex items-center justify-between py-1 border-b border-blue-100/30 last:border-0 dark:border-slate-800/40">
                    <div className="flex items-center gap-2.5">
                      {debt.avatarUrl ? (
                        <img
                          src={debt.avatarUrl}
                          alt={debt.name}
                          className="w-7 h-7 rounded-full object-cover shadow-sm"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-blue-500/10 text-blue-600 font-bold flex items-center justify-center text-xs dark:bg-blue-500/20 dark:text-blue-300">
                          {debt.name.charAt(0)}
                        </div>
                      )}
                      <span className="text-foreground text-xs font-semibold">{debt.name}</span>
                    </div>
                    <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                      +${debt.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 3: What You Owe */}
        <Card className="rounded-2xl border-rose-100 bg-gradient-to-b from-rose-50/30 to-rose-50/70 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md dark:border-rose-950/20 dark:from-slate-900/30 dark:to-slate-900/50 dark:bg-card">
          <CardContent className="p-6 flex flex-col h-full min-h-[14rem]">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 text-[10px] font-bold tracking-wider uppercase">
              <ArrowUpRight className="h-4 w-4" />
              What you owe
            </div>

            <div className="font-headline text-rose-800 dark:text-rose-300 text-3xl font-extrabold sm:text-4xl mt-3 mb-4">
              ${totalUserOwes.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>

            {whatYouOwe.length === 0 ? (
              <div className="text-muted-foreground flex-1 flex items-center justify-center text-center text-xs px-4">
                You do not owe anyone right now. Splendid job!
              </div>
            ) : (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3 overflow-y-auto max-h-[5.5rem] pr-1">
                  {whatYouOwe.map((debt: DebtRelation) => (
                    <div key={debt.userId} className="flex items-center justify-between py-1 border-b border-rose-100/30 last:border-0 dark:border-slate-800/40">
                      <div className="flex items-center gap-2.5">
                        {debt.avatarUrl ? (
                          <img
                            src={debt.avatarUrl}
                            alt={debt.name}
                            className="w-7 h-7 rounded-full object-cover shadow-sm"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-rose-500/10 text-rose-600 font-bold flex items-center justify-center text-xs dark:bg-rose-500/20 dark:text-rose-300">
                            {debt.name.charAt(0)}
                          </div>
                        )}
                        <span className="text-foreground text-xs font-semibold">{debt.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-rose-600 dark:text-rose-400 text-xs font-bold">
                          -${debt.amount.toFixed(2)}
                        </span>
                        <button
                          onClick={() => onSettleUp(debt)}
                          className="bg-rose-600 text-white hover:bg-rose-700 text-[10px] font-bold px-2 py-0.5 rounded transition-colors"
                        >
                          Settle Up
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
