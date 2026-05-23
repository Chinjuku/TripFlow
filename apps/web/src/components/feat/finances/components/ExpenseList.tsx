import React, { useState } from 'react';
import { Utensils, Car, Compass, Home, Banknote, ChevronDown, ChevronUp, ArrowRightLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@trip-flow/ui/components/button';
import type { HydratedExpense, HydratedSettlement, HydratedExpenseSplit } from '../types';
import { Link, useParams, useLocation } from 'react-router-dom';

interface ExpenseListProps {
  expenses: HydratedExpense[];
  settlements: HydratedSettlement[];
  currentUserId: string;
  onConfirmSettlement: (id: string) => Promise<void>;
  confirmingId: string | null;
}

export function ExpenseList({
  expenses,
  settlements,
  currentUserId,
  onConfirmSettlement,
  confirmingId,
}: ExpenseListProps) {
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  const toggleExpand = (id: string) => {
    setExpandedExpenseId((prev) => (prev === id ? null : id));
  };

  // Combine and sort chronologically (Expenses & Settlements)
  type FeedItem =
    | { type: 'expense'; date: string; data: HydratedExpense }
    | { type: 'settlement'; date: string; data: HydratedSettlement };

  const feedItems: FeedItem[] = [
    ...expenses.map((e) => ({ type: 'expense' as const, date: e.expense_date || e.created_at, data: e })),
    ...settlements.map((s) => ({ type: 'settlement' as const, date: s.created_at, data: s })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Category styling helpers
  const categoryStyles = {
    food: { icon: Utensils, bg: 'bg-purple-100/70 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300', badge: 'bg-purple-50/50 border-purple-200/50 text-purple-700 dark:border-purple-900/30 dark:text-purple-300' },
    transport: { icon: Car, bg: 'bg-primary/10 text-primary', badge: 'bg-primary/5 border-primary/20 text-primary' },
    activity: { icon: Compass, bg: 'bg-warning/10 text-warning', badge: 'bg-warning/5 border-warning/20 text-warning' },
    lodging: { icon: Home, bg: 'bg-sky-100/70 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300', badge: 'bg-sky-50/50 border-sky-200/50 text-sky-700 dark:border-sky-900/30 dark:text-sky-300' },
    other: { icon: Banknote, bg: 'bg-muted text-muted-foreground', badge: 'bg-muted border-border text-muted-foreground' },
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
        <h3 className="font-headline text-foreground text-xl font-bold tracking-tight">Recent Activity</h3>
        {location.pathname.endsWith('/finances') && (
          <Link to={`/trips/${id}/all-expenses`} className="text-primary text-sm font-semibold hover:text-primary/80 hover:underline">See all</Link>
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
              const mySplit = exp.splits.find((s: HydratedExpenseSplit) => s.user_id === currentUserId);
              
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
                mySplitSummary = totalLent > 0 ? `Lent ฿${totalLent.toFixed(2)}` : 'Self paid';
              } else {
                mySplitSummary = mySplit ? `You owe ฿${mySplit.amount.toFixed(2)}` : 'Not involved';
              }

              return (
                <div
                  key={`expense-${exp.id}`}
                  className="bg-card hover:bg-card/75 border border-border rounded-2xl transition-all duration-200 overflow-hidden shadow-sm hover:shadow"
                >
                  <div
                    onClick={() => toggleExpand(exp.id)}
                    className="flex items-center justify-between p-4 cursor-pointer sm:p-5 select-none"
                  >
                    <div className="flex items-center gap-4">
                      {/* Category Rounded Icon */}
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center shadow-sm shrink-0 ${cat.bg}`}>
                        <CatIcon className="w-5 h-5" />
                      </div>
                      
                      <div className="space-y-0.5">
                        <h4 className="text-foreground text-sm font-bold sm:text-base leading-tight">
                          {exp.description}
                        </h4>
                        <div className="text-muted-foreground text-xs flex flex-wrap items-center gap-1">
                          <span>Paid by {isPaidByMe ? 'You' : exp.payerName}</span>
                          <span className="opacity-40">•</span>
                          <span>{formatDate(exp.expense_date)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right space-y-0.5">
                        <span className="font-headline font-bold text-base text-foreground group-hover:text-primary transition-colors">
                          ฿{exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <div className={`text-xs font-semibold ${isPaidByMe ? 'text-primary' : mySplit ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {mySplitSummary}
                        </div>
                      </div>
                      <div className="text-muted-foreground hidden sm:block">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Split Breakdown */}
                  {isExpanded && (
                    <div className="bg-muted/30 border-t border-border px-5 py-4 space-y-3">
                      <div className="flex justify-between items-center text-[10px] font-bold tracking-wider text-muted-foreground uppercase font-label">
                        <span>Split Breakdown ({splitLabel})</span>
                        <span>Share</span>
                      </div>
                      <div className="space-y-2">
                        {exp.splits.map((split: HydratedExpenseSplit) => {
                          const isSplitMe = split.user_id === currentUserId;
                          return (
                            <div key={split.id} className="flex items-center justify-between text-xs py-1">
                              <div className="flex items-center gap-2">
                                {split.avatarUrl ? (
                                  <img
                                    src={split.avatarUrl}
                                    alt={split.userName}
                                    className="w-5 h-5 rounded-full object-cover shadow-sm"
                                  />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-muted-foreground/10 text-muted-foreground font-bold flex items-center justify-center text-[10px]">
                                    {split.userName.charAt(0)}
                                  </div>
                                )}
                                <span className={`font-medium ${isSplitMe ? 'text-primary font-semibold' : 'text-foreground'}`}>
                                  {isSplitMe ? 'You' : split.userName}
                                  {split.item_paid && (
                                    <span className="text-muted-foreground text-[10px] italic ml-1.5 font-normal">
                                      ({split.item_paid})
                                    </span>
                                  )}
                                </span>
                              </div>
                              <span className="font-headline font-bold">
                                ฿{split.amount.toFixed(2)}
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
                  className="bg-primary/[0.03] border border-primary/10 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-sm transition-all duration-200 dark:bg-primary/[0.01] dark:border-primary/20"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                      set.status === 'completed' ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning'
                    }`}>
                      {set.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : <ArrowRightLeft className="w-5 h-5" />}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-foreground text-sm font-bold sm:text-base leading-tight">
                          {isPayerMe ? 'You' : set.payerName} settled with {isPayeeMe ? 'you' : set.payeeName}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border font-label ${
                          set.status === 'completed' 
                            ? 'bg-primary/10 border-primary/20 text-primary' 
                            : 'bg-warning/10 border-warning/20 text-warning'
                        }`}>
                          {set.status === 'completed' ? 'Paid' : 'Pending Confirmation'}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {formatDate(set.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-4">
                    <div className="space-y-0.5">
                      <div className="text-primary font-headline text-sm font-extrabold sm:text-base">
                        ฿{set.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      {set.status === 'pending' && isPayeeMe && (
                        <Button
                          disabled={confirmingId === set.id}
                          onClick={() => onConfirmSettlement(set.id)}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[10px] px-2.5 py-1 h-auto rounded mt-1 shadow-sm shrink-0 font-label"
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
