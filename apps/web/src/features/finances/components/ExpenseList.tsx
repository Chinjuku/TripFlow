import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Utensils,
  Car,
  Compass,
  Home,
  Banknote,
  ChevronDown,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@trip-flow/ui/components/button';
import type { HydratedExpense, HydratedSettlement, HydratedExpenseSplit } from '../types';

interface ExpenseListProps {
  expenses: HydratedExpense[];
  settlements: HydratedSettlement[];
  currentUserId: string;
  onConfirmSettlement: (id: string) => Promise<void>;
  confirmingId: string | null;
  seeAllLink?: string;
}

export function ExpenseList({
  expenses,
  settlements,
  currentUserId,
  onConfirmSettlement,
  confirmingId,
  seeAllLink,
}: ExpenseListProps) {
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedExpenseId((prev) => (prev === id ? null : id));
  };

  // Combine and sort chronologically (Expenses & Settlements)
  type FeedItem =
    | { type: 'expense'; date: string; data: HydratedExpense }
    | { type: 'settlement'; date: string; data: HydratedSettlement };

  const feedItems: FeedItem[] = [
    ...expenses.map((e) => ({
      type: 'expense' as const,
      date: e.expense_date || e.created_at,
      data: e,
    })),
    ...settlements.map((s) => ({ type: 'settlement' as const, date: s.created_at, data: s })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Category styling helpers
  const categoryStyles = {
    food: {
      icon: Utensils,
      bg: 'bg-primary text-primary-foreground',
    },
    transport: {
      icon: Car,
      bg: 'bg-secondary text-secondary-foreground',
    },
    activity: {
      icon: Compass,
      bg: 'bg-tertiary text-tertiary-foreground',
    },
    lodging: {
      icon: Home,
      bg: 'bg-warning/10 text-warning',
    },
    other: {
      icon: Banknote,
      bg: 'bg-muted text-muted-foreground',
    },
  };

  // Human date formatter
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (d.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h3 className="font-headline text-foreground text-xl font-bold tracking-tight">
          Recent Activity
        </h3>
        {seeAllLink && (
          <Link
            to={seeAllLink}
            className="text-primary hover:text-primary/80 text-xs font-bold tracking-wide uppercase transition-colors"
          >
            See All
          </Link>
        )}
      </div>

      {feedItems.length === 0 ? (
        <div className="border border-dashed border-border rounded-2xl p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
          <Banknote className="w-12 h-12 text-muted-foreground/30" />
          <h4 className="font-bold text-foreground text-sm">No transactions yet</h4>
          <p className="text-xs max-w-xs">
            Start tracking trip costs by using the "Record Expense" button at the top.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {feedItems.map((item) => {
            if (item.type === 'expense') {
              const exp = item.data;
              const isExpanded = expandedExpenseId === exp.id;
              const catKey = exp.category as keyof typeof categoryStyles;
              const cat = categoryStyles[catKey] || categoryStyles.other;
              const CatIcon = cat.icon;

              const isPaidByMe = exp.paid_by_id === currentUserId;
              const mySplit = exp.splits.find(
                (s: HydratedExpenseSplit) => s.user_id === currentUserId,
              );

              // Calculate split summary label
              let splitLabel = '';
              let mySplitSummary = '';
              if (exp.split_method === 'equally') {
                splitLabel = `Split ${exp.splits.length} ways`;
              } else {
                splitLabel = 'Exact Amount';
              }

              if (isPaidByMe) {
                const totalLent = exp.amount - (mySplit?.amount ?? 0);
                mySplitSummary = totalLent > 0 ? `Lent $${totalLent.toFixed(2)}` : 'Self paid';
              } else {
                mySplitSummary = mySplit ? `You owe $${mySplit.amount.toFixed(2)}` : 'Not involved';
              }

              return (
                <div
                  key={`expense-${exp.id}`}
                  className="bg-white border border-[#e8eaed] rounded-2xl transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md"
                >
                  <div
                    onClick={() => toggleExpand(exp.id)}
                    className="flex items-center justify-between p-4 cursor-pointer sm:p-5 select-none"
                  >
                    <div className="flex items-center gap-4">
                      {/* Category Rounded Icon */}
                      <div
                        className={`w-11 h-11 rounded-full flex items-center justify-center shadow-sm shrink-0 ${cat.bg}`}
                      >
                        <CatIcon className="w-5 h-5" />
                      </div>

                      <div className="space-y-0.5">
                        <h4 className="text-foreground text-sm font-bold sm:text-base leading-tight">
                          {exp.description}
                        </h4>
                        <div className="text-muted-foreground text-xs flex flex-wrap items-center gap-1.5">
                          <span>Paid by {isPaidByMe ? 'You' : exp.payerName}</span>
                          <span className="opacity-40">•</span>
                          <span className="bg-tertiary/50 text-tertiary-foreground px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-tertiary">
                            {exp.split_method === 'equally' ? 'Equally' : 'Exact'}
                          </span>
                          <span className="opacity-40">•</span>
                          <span>{formatDate(exp.expense_date)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right space-y-0.5">
                        <div className="text-foreground font-headline text-sm font-extrabold sm:text-base">
                          $
                          {exp.amount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        <div
                          className={`text-xs font-semibold ${isPaidByMe ? 'text-emerald-600' : mySplit ? 'text-rose-600' : 'text-muted-foreground'}`}
                        >
                          {mySplitSummary}
                        </div>
                      </div>
                      <div className="text-muted-foreground hidden sm:block">
                        <ChevronDown
                          className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180 text-foreground' : ''}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Expanded Split Breakdown */}
                  {isExpanded && (
                    <div className="bg-[#f8f9fa] border-t border-[#e8eaed] px-5 py-4 space-y-4">
                      <div className="flex justify-between items-center text-[10px] font-bold tracking-widest text-[#5f6368] uppercase">
                        <span>Split Details ({exp.splits.length} People)</span>
                      </div>
                      <div className="space-y-2">
                        {exp.splits.map((split: HydratedExpenseSplit) => {
                          const isSplitMe = split.user_id === currentUserId;
                          const isPayer = split.user_id === exp.paid_by_id;
                          const initials = split.userName
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2);

                          return (
                            <div
                              key={split.id}
                              className="flex items-center justify-between bg-white p-3 rounded-xl border border-[#e8eaed] shadow-sm"
                            >
                              <div className="flex items-center gap-3">
                                {split.avatarUrl ? (
                                  <img
                                    src={split.avatarUrl}
                                    alt={split.userName}
                                    className="w-8 h-8 rounded-full object-cover border border-[#e8eaed]"
                                  />
                                ) : (
                                  <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-inner ${
                                      isPayer ? 'bg-[#005f42]' : 'bg-[#5f6368]'
                                    }`}
                                  >
                                    {initials}
                                  </div>
                                )}
                                <div className="flex flex-col">
                                  <span
                                    className={`font-bold text-sm ${isSplitMe ? 'text-primary' : 'text-foreground'}`}
                                  >
                                    {isSplitMe ? 'You' : split.userName}
                                    {isPayer && (
                                      <span className="text-[#5f6368] font-medium text-[11px] ml-2">
                                        (Payer)
                                      </span>
                                    )}
                                  </span>
                                  {split.item_paid && (
                                    <span className="text-muted-foreground text-[10px] italic font-normal">
                                      {split.item_paid}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="text-foreground font-bold text-sm">
                                ${split.amount.toFixed(2)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            } else {
              // Peer-to-Peer Repayment Settlement
              const set = item.data;
              const isPayerMe = set.payer_id === currentUserId;
              const isPayeeMe = set.payee_id === currentUserId;

              return (
                <div
                  key={`settlement-${set.id}`}
                  className="bg-emerald-50/20 border border-emerald-100/50 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-sm transition-all duration-200 dark:bg-emerald-950/5 dark:border-emerald-950/20"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                        set.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {set.status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <ArrowRightLeft className="w-5 h-5" />
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-foreground text-sm font-bold sm:text-base leading-tight">
                          {isPayerMe ? 'You' : set.payerName} settled with{' '}
                          {isPayeeMe ? 'you' : set.payeeName}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            set.status === 'completed'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-amber-50 border-amber-200 text-amber-700'
                          }`}
                        >
                          {set.status === 'completed' ? 'Paid' : 'Pending Confirmation'}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs">{formatDate(set.created_at)}</p>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-4">
                    <div className="space-y-0.5">
                      <div className="text-emerald-700 dark:text-emerald-400 font-headline text-sm font-extrabold sm:text-base">
                        $
                        {set.amount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      {set.status === 'pending' && isPayeeMe && (
                        <Button
                          disabled={confirmingId === set.id}
                          onClick={() => onConfirmSettlement(set.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2.5 py-1 h-auto rounded mt-1 shadow-sm shrink-0"
                        >
                          {confirmingId === set.id ? 'Confirming...' : 'Confirm Paid'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            }
          })}
        </div>
      )}
    </div>
  );
}
