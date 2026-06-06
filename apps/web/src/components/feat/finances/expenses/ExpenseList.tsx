import React, { useState, useMemo } from 'react';
import {
  Utensils,
  Car,
  Compass,
  Home,
  Banknote,
  ChevronDown,
  ArrowRightLeft,
  CheckCircle2,
  Search,
  Filter,
  PiggyBank,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { HydratedExpense, HydratedSettlement, HydratedExpenseSplit } from '@/types/finances';
import { Link, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DatePicker } from '@/components/ui/date-picker';
import { formatLocalizedDate } from '@/lib/utils';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterInvolved, setFilterInvolved] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterDirection, setFilterDirection] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);

  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const toggleExpand = (expenseId: string) => {
    setExpandedExpenseId((prev) => (prev === expenseId ? null : expenseId));
  };

  // Combine and sort chronologically (Expenses & Settlements)
  type FeedItem =
    | { type: 'expense'; date: string; data: HydratedExpense }
    | { type: 'settlement'; date: string; data: HydratedSettlement };

  const feedItems = useMemo(() => {
    const combined: FeedItem[] = [
      ...expenses.map((e) => ({
        type: 'expense' as const,
        date: e.expense_date || e.created_at,
        data: e,
      })),
      ...settlements.map((s) => ({
        type: 'settlement' as const,
        date: s.created_at,
        data: s,
      })),
    ];

    return combined
      .filter((item) => {
        // 1. Search filter
        if (searchTerm) {
          const lowerSearch = searchTerm.toLowerCase();
          if (item.type === 'expense') {
            if (
              !item.data.description.toLowerCase().includes(lowerSearch) &&
              !item.data.payerName.toLowerCase().includes(lowerSearch)
            )
              return false;
          } else {
            if (
              !item.data.payerName.toLowerCase().includes(lowerSearch) &&
              !item.data.payeeName.toLowerCase().includes(lowerSearch)
            )
              return false;
          }
        }

        // 2. Date filter
        if (filterDate) {
          const filterDateStr = new Date(
            filterDate.getTime() - filterDate.getTimezoneOffset() * 60000,
          )
            .toISOString()
            .split('T')[0];
          const itemDate = new Date(item.date).toISOString().split('T')[0];
          if (itemDate !== filterDateStr) return false;
        }

        // 3. Category / Type filter
        if (filterCategory !== 'all') {
          if (filterCategory === 'central_fund') {
            if (!item.data.is_central_fund) return false;
          } else if (filterCategory === 'transfer') {
            if (item.type !== 'settlement') return false;
          } else {
            if (item.type !== 'expense' || item.data.category !== filterCategory) return false;
          }
        }

        // 4. Direction & Involvement filters
        let isMePayer = false;
        let mySplitAmount = 0;
        let isMeInvolved = false;

        if (item.type === 'expense') {
          isMePayer = item.data.paid_by_id === currentUserId;
          const mySplit = item.data.splits.find((s) => s.user_id === currentUserId);
          mySplitAmount = mySplit ? mySplit.amount : 0;
          isMeInvolved = isMePayer || mySplitAmount > 0;
        } else {
          isMePayer = item.data.payer_id === currentUserId;
          isMeInvolved = isMePayer || item.data.payee_id === currentUserId;
        }

        if (filterInvolved && !isMeInvolved) return false;

        if (filterDirection === 'receive') {
          if (item.type === 'expense') {
            if (!isMePayer || item.data.amount - mySplitAmount <= 0) return false;
          } else {
            if (item.data.payee_id !== currentUserId) return false;
          }
        } else if (filterDirection === 'pay') {
          if (item.type === 'expense') {
            if (isMePayer || mySplitAmount <= 0) return false;
          } else {
            if (item.data.payer_id !== currentUserId) return false;
          }
        }

        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [
    expenses,
    settlements,
    searchTerm,
    filterDate,
    filterCategory,
    filterDirection,
    filterInvolved,
    currentUserId,
  ]);

  // Category styling helpers
  const categoryStyles = {
    food: {
      icon: Utensils,
      bg: 'bg-purple-100/70 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300',
      badge:
        'bg-purple-50/50 border-purple-200/50 text-purple-700 dark:border-purple-900/30 dark:text-purple-300',
    },
    transport: {
      icon: Car,
      bg: 'bg-primary/10 text-primary',
      badge: 'bg-primary/5 border-primary/20 text-primary',
    },
    activity: {
      icon: Compass,
      bg: 'bg-warning/10 text-warning',
      badge: 'bg-warning/5 border-warning/20 text-warning',
    },
    lodging: {
      icon: Home,
      bg: 'bg-sky-100/70 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300',
      badge: 'bg-sky-50/50 border-sky-200/50 text-sky-700 dark:border-sky-900/30 dark:text-sky-300',
    },
    other: {
      icon: Banknote,
      bg: 'bg-muted text-muted-foreground',
      badge: 'bg-muted border-border text-muted-foreground',
    },
  };

  // Human date formatter
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return t('common.today');
    } else if (d.toDateString() === yesterday.toDateString()) {
      return t('common.yesterday');
    } else {
      return formatLocalizedDate(d, i18n.language, { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-border pb-3">
        <div className="flex items-center justify-between">
          <h3 className="font-headline text-foreground text-xl font-bold tracking-tight">
            {t('finances.recentActivity')}
          </h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={`h-8 px-2.5 text-xs font-bold ${showFilters ? 'bg-primary/10 text-primary border-primary/20' : ''}`}
            >
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              {t('common.filters', 'Filters')}
            </Button>
            {seeAllLink && (
              <Link
                to={seeAllLink}
                className="text-primary hover:text-primary/80 text-xs font-bold tracking-wide transition-colors"
              >
                {t('common.seeAll', 'See All')}
              </Link>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="bg-muted/30 border border-border rounded-xl p-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('finances.searchPlaceholder', 'Search...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs bg-background"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <select
                className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-2.5 py-1 text-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-medium"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="all">{t('finances.filterAllCategories', 'All Types')}</option>
                <option value="food">{t('finances.categoryFood', 'Food')}</option>
                <option value="transport">{t('finances.categoryTransport', 'Transport')}</option>
                <option value="lodging">{t('finances.categoryLodging', 'Lodging')}</option>
                <option value="activity">{t('finances.categoryActivity', 'Activity')}</option>
                <option value="other">{t('finances.categoryOther', 'Other')}</option>
                <option value="central_fund">
                  {t('finances.centralFund.title', 'Central Fund')}
                </option>
                <option value="transfer">{t('finances.filterTransfer', 'Transfer')}</option>
              </select>

              <select
                className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-2.5 py-1 text-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-medium"
                value={filterDirection}
                onChange={(e) => setFilterDirection(e.target.value)}
              >
                <option value="all">{t('finances.filterAllDirections', 'Any Direction')}</option>
                <option value="receive">{t('finances.filterIgetMoney', 'I Get Money')}</option>
                <option value="pay">{t('finances.filterIowe', 'I Owe Money')}</option>
              </select>

              <div className="relative w-full">
                <DatePicker
                  value={filterDate}
                  onChange={(date) => setFilterDate(date)}
                  minDate={null}
                  placeholder={t('finances.filterDate', 'Select Date')}
                  className="w-full [&>button]:h-8 [&>button]:text-xs [&>button]:py-1 [&>button]:px-2.5 [&>button]:font-medium [&>button>svg]:w-3.5 [&>button>svg]:h-3.5 [&>button]:pr-8"
                />
                {filterDate && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFilterDate(undefined);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center bg-muted hover:bg-muted-foreground/20 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Clear date filter"
                  >
                    <span className="text-[10px] leading-none font-bold">×</span>
                  </button>
                )}
              </div>

              <label className="flex items-center gap-2 px-2 h-8 rounded-md border border-input bg-background cursor-pointer hover:bg-muted/50 transition-colors">
                <input
                  type="checkbox"
                  checked={filterInvolved}
                  onChange={(e) => setFilterInvolved(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <span className="text-xs font-bold text-foreground select-none">
                  {t('finances.filterInvolvedOnly', 'Involved Only')}
                </span>
              </label>
            </div>
          </div>
        )}
      </div>

      {feedItems.length === 0 ? (
        <div className="border border-dashed border-border rounded-2xl p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
          <Banknote className="w-12 h-12 text-muted-foreground/30" />
          <h4 className="font-bold text-foreground text-sm">{t('finances.noTransactionsYet')}</h4>
          <p className="text-xs max-w-xs">{t('finances.noTransactionsDesc')}</p>
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
                splitLabel = t('finances.splitNways', { count: exp.splits.length });
              } else {
                splitLabel = t('finances.exactAmount');
              }

              if (isPaidByMe) {
                const totalLent = exp.amount - (mySplit?.amount ?? 0);
                mySplitSummary =
                  totalLent > 0
                    ? `${t('finances.lent')} ฿${totalLent.toFixed(2)}`
                    : t('finances.selfPaid');
              } else {
                mySplitSummary = mySplit
                  ? `${t('finances.youOwe')} ฿${mySplit.amount.toFixed(2)}`
                  : t('finances.notInvolved');
              }

              return (
                <div
                  key={`expense-${exp.id}`}
                  className="bg-card border border-border rounded-2xl transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md"
                >
                  <div
                    onClick={() => toggleExpand(exp.id)}
                    className="flex items-center justify-between p-4 cursor-pointer sm:p-5 select-none"
                  >
                    <div className="flex items-center gap-4">
                      {/* Category Rounded Icon */}
                      <div
                        className={`w-11 h-11 rounded-full flex items-center justify-center shadow-sm shrink-0 relative ${cat.bg}`}
                      >
                        <CatIcon className="w-5 h-5" />
                        {exp.is_central_fund && (
                          <div
                            className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center border-2 border-background"
                            title={t('finances.centralFund.title')}
                          >
                            <PiggyBank className="w-3 h-3" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-foreground text-sm font-bold sm:text-base leading-tight">
                            {exp.description}
                          </h4>
                          {exp.is_central_fund && (
                            <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-primary/20 shrink-0 hidden sm:inline-block">
                              {t('finances.centralFund.title', 'Central Fund')}
                            </span>
                          )}
                        </div>
                        <div className="text-muted-foreground text-xs flex flex-wrap items-center gap-1">
                          <span>
                            {t('finances.paidBy')} {isPaidByMe ? t('common.you') : exp.payerName}
                          </span>
                          <span className="opacity-40">•</span>
                          <span className="bg-tertiary/50 text-tertiary-foreground px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-tertiary">
                            {exp.split_method === 'equally'
                              ? t('finances.equally', 'Equally')
                              : t('finances.exact', 'Exact')}
                          </span>
                          <span className="opacity-40">•</span>
                          <span>{formatDate(exp.expense_date)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right space-y-0.5">
                        <span className="font-headline font-bold text-base text-foreground group-hover:text-primary transition-colors">
                          ฿
                          {exp.amount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                        <div
                          className={`text-xs font-semibold ${isPaidByMe ? 'text-primary' : mySplit ? 'text-destructive' : 'text-muted-foreground'}`}
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
                    <div className="bg-muted/30 border-t border-border px-5 py-4 space-y-3">
                      <div className="flex justify-between items-center text-[10px] font-bold tracking-wider text-muted-foreground uppercase font-label">
                        <span>
                          {t('finances.splitBreakdown')} ({splitLabel})
                        </span>
                        <span>{t('finances.share')}</span>
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
                              className={`flex items-center justify-between p-3 rounded-xl border shadow-sm ${
                                isPayer
                                  ? 'bg-primary/5 border-primary/20'
                                  : 'bg-muted/30 border-border'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-3">
                                {split.avatarUrl ? (
                                  <img
                                    src={split.avatarUrl}
                                    alt={split.userName}
                                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border ${isPayer ? 'border-primary ring-2 ring-primary/20' : 'border-border'} shrink-0`}
                                  />
                                ) : (
                                  <div
                                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-bold shadow-inner ${
                                      isPayer
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted-foreground text-white'
                                    } shrink-0`}
                                  >
                                    {initials}
                                  </div>
                                )}
                                <div className="flex flex-col min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span
                                      className={`font-medium truncate ${isSplitMe ? 'text-primary font-semibold' : 'text-foreground'} text-xs sm:text-sm`}
                                    >
                                      {isSplitMe ? t('common.you') : split.userName}
                                    </span>
                                    {isPayer && (
                                      <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold uppercase tracking-wider border border-primary/20 shrink-0">
                                        {t('finances.payer', 'Payer')}
                                      </span>
                                    )}
                                  </div>
                                  {exp.split_method === 'exact_amount' && split.item_paid && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {split.item_paid
                                        .split(',')
                                        .map((item: string, idx: number) => (
                                          <span
                                            key={idx}
                                            className="bg-background text-muted-foreground border border-border px-2 py-0.5 rounded-md text-[9px] font-medium shadow-sm truncate max-w-[80px]"
                                          >
                                            {item.trim()}
                                          </span>
                                        ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <span className="font-headline font-bold text-xs sm:text-sm shrink-0">
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
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-sm relative ${
                        set.status === 'completed'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-warning/10 text-warning'
                      }`}
                    >
                      {set.status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <ArrowRightLeft className="w-5 h-5" />
                      )}
                      {set.is_central_fund && (
                        <div
                          className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center border-2 border-background"
                          title={t('finances.centralFund.title')}
                        >
                          <PiggyBank className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-foreground text-sm font-bold sm:text-base leading-tight">
                          {isPayerMe ? t('common.you') : set.payerName} {t('finances.settledWith')}{' '}
                          {isPayeeMe ? t('common.you') : set.payeeName}
                        </span>
                        {set.is_central_fund && (
                          <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-primary/20 shrink-0 hidden sm:inline-block">
                            {t('finances.centralFund.title', 'Central Fund')}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border font-label ${
                            set.status === 'completed'
                              ? 'bg-primary/10 border-primary/20 text-primary'
                              : 'bg-warning/10 border-warning/20 text-warning'
                          }`}
                        >
                          {set.status === 'completed'
                            ? t('finances.paid')
                            : t('finances.pendingConfirmation')}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs">{formatDate(set.created_at)}</p>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-4">
                    <div className="space-y-0.5">
                      <div className="text-primary font-headline text-sm font-extrabold sm:text-base">
                        ฿
                        {set.amount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      {set.status === 'pending' && isPayeeMe && (
                        <Button
                          disabled={confirmingId === set.id}
                          onClick={() => onConfirmSettlement(set.id)}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[10px] px-2.5 py-1 h-auto rounded mt-1 shadow-sm shrink-0 font-label"
                        >
                          {confirmingId === set.id
                            ? t('finances.confirming')
                            : t('finances.confirmPaid')}
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
