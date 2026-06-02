import React, { useState, useMemo } from 'react';
import { Search, Filter, User } from 'lucide-react';
import { Input } from '@trip-flow/ui/components/input';
import { useTranslation } from 'react-i18next';
import { DatePicker } from '@trip-flow/ui/components/date-picker';

import {
  TripFinancesLayout,
  useTripFinancesContext,
} from '@/components/feat/finances/TripFinancesLayout';
import { AllExpenseItem } from '@/components/feat/finances/all-expenses/AllExpenseItem';
import { AllExpensesSkeleton } from '@/components/feat/finances/all-expenses/AllExpensesSkeleton';
import type { HydratedExpense } from '@/components/feat/finances';

export default function AllExpensePage() {
  return (
    <TripFinancesLayout activeTab="all-expense">
      <AllExpensesContent />
    </TripFinancesLayout>
  );
}

function AllExpensesContent() {
  const { finances, user, isLoading } = useTripFinancesContext();
  const { t } = useTranslation();

  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters state
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [payerFilter, setPayerFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);

  const toggleExpand = (expenseId: string) => {
    setExpandedId((prev) => (prev === expenseId ? null : expenseId));
  };

  const filteredExpenses = useMemo(() => {
    if (!finances?.expenses) return [];
    return finances.expenses.filter((exp: HydratedExpense) => {
      const matchesSearch =
        exp.description.toLowerCase().includes(search.toLowerCase()) ||
        exp.payerName.toLowerCase().includes(search.toLowerCase());

      const matchesCategory = !categoryFilter || exp.category === categoryFilter;
      const matchesPayer = !payerFilter || exp.paid_by_id === payerFilter;

      let matchesDate = true;
      if (dateFilter) {
        const dateStr = new Date(dateFilter.getTime() - dateFilter.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 10);
        matchesDate =
          (exp.expense_date && exp.expense_date.startsWith(dateStr)) ||
          exp.created_at.startsWith(dateStr);
      }

      return matchesSearch && matchesCategory && matchesPayer && matchesDate;
    });
  }, [finances?.expenses, search, categoryFilter, payerFilter, dateFilter]);

  const groupedExpenses = useMemo(() => {
    const groups: Record<string, HydratedExpense[]> = {};

    filteredExpenses.forEach((exp: HydratedExpense) => {
      const date = new Date(exp.expense_date || exp.created_at);
      const dateStr = date
        .toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        })
        .toUpperCase();

      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      let label = dateStr;
      if (date.toDateString() === today.toDateString()) {
        label = `${t('common.today').toUpperCase()}, ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()}`;
      } else if (date.toDateString() === yesterday.toDateString()) {
        label = `${t('common.yesterday').toUpperCase()}, ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()}`;
      }

      let group = groups[label];
      if (!group) {
        group = [];
        groups[label] = group;
      }
      group.push(exp);
    });

    return groups;
  }, [filteredExpenses, t]);

  // Generate unique payers for filter
  const uniquePayers = useMemo(() => {
    if (!finances?.expenses) return [];
    const payersMap = new Map<string, string>();
    finances.expenses.forEach((exp: HydratedExpense) => {
      payersMap.set(exp.paid_by_id, exp.payerName);
    });
    return Array.from(payersMap.entries()).map(([id, name]) => ({ id, name }));
  }, [finances?.expenses]);

  if (isLoading) {
    return <AllExpensesSkeleton />;
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden gap-6 h-full min-h-0 animate-in fade-in-0 duration-300">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('finances.searchExpenses', 'Search merchants or payers...')}
            className="pl-10 h-10 rounded-xl bg-card border-border shadow-sm focus-visible:ring-1 focus-visible:ring-primary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-none shrink-0">
          <div className="relative flex items-center">
            <Filter className="absolute left-3 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <select
              className="appearance-none bg-card text-foreground border border-border shadow-sm rounded-full h-10 pl-9 pr-8 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:bg-muted transition-colors text-center"
              value={categoryFilter || ''}
              onChange={(e) => setCategoryFilter(e.target.value || null)}
            >
              <option value="">
                {t('common.category', 'Category')} ({t('common.all', 'All')})
              </option>
              <option value="food">{t('finances.category.food', 'Food')}</option>
              <option value="transport">{t('finances.category.transport', 'Transport')}</option>
              <option value="lodging">{t('finances.category.lodging', 'Lodging')}</option>
              <option value="activity">{t('finances.category.activity', 'Activity')}</option>
              <option value="other">{t('finances.category.other', 'Other')}</option>
            </select>
          </div>

          <div className="w-[140px] shrink-0">
            <DatePicker
              value={dateFilter}
              onChange={(date) => setDateFilter(date)}
              minDate={null}
              placeholder={t('common.dateRange', 'Date Range')}
              className="[&>button]:h-10 [&>button]:rounded-full [&>button]:border-border [&>button]:bg-card [&>button]:shadow-sm [&>button]:hover:bg-muted [&>button]:font-semibold [&>button]:text-xs [&>button>span]:text-foreground [&>button]:justify-center"
            />
          </div>

          <div className="relative flex items-center">
            <User className="absolute left-3 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <select
              className="appearance-none bg-card text-foreground border border-border shadow-sm rounded-full h-10 pl-9 pr-8 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:bg-muted transition-colors text-center"
              value={payerFilter || ''}
              onChange={(e) => setPayerFilter(e.target.value || null)}
            >
              <option value="">
                {t('finances.payer', 'Payer')} ({t('common.all', 'All')})
              </option>
              {uniquePayers.map((payer) => (
                <option key={payer.id} value={payer.id}>
                  {payer.id === user?.id ? t('common.you', 'You') : payer.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Expense List */}
      <div className="flex-1 overflow-y-auto pr-2 min-h-0 pb-10 space-y-8">
        {Object.entries(groupedExpenses).map(([dateLabel, expenses]) => (
          <div key={dateLabel} className="space-y-4">
            <h3 className="text-muted-foreground text-[11px] font-bold tracking-widest uppercase font-label">
              {dateLabel}
            </h3>
            <div className="space-y-3">
              {expenses.map((exp) => (
                <AllExpenseItem
                  key={exp.id}
                  expense={exp}
                  currentUserId={user?.id || ''}
                  isExpanded={expandedId === exp.id}
                  onToggleExpand={() => toggleExpand(exp.id)}
                />
              ))}
            </div>
          </div>
        ))}

        {filteredExpenses.length === 0 && (
          <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border shadow-sm">
            <p className="text-muted-foreground font-medium">
              {t('finances.noExpensesFound', 'No expenses found matching your search.')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
