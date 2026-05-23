import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Plus,
  Filter,
  Calendar,
  User,
  ChevronRight,
  Utensils,
  Car,
  Compass,
  Home,
  Banknote,
  ChevronDown,
  ShoppingCart,
} from 'lucide-react';
import { Button } from '@trip-flow/ui/components/button';
import { Input } from '@trip-flow/ui/components/input';
import { Skeleton } from '@trip-flow/ui/components/skeleton';
import { useTrip } from '@/features/trips';
import { useAuth } from '@/features/auth/useAuth';
import {
  useTripFinances,
  createExpense,
  CreateExpenseModal,
  type HydratedExpense,
} from '@/features/finances';

const categoryStyles = {
  food: { icon: Utensils, bg: 'bg-primary text-primary-foreground', label: 'Food & Drink' },
  transport: { icon: Car, bg: 'bg-secondary text-secondary-foreground', label: 'Transport' },
  activity: { icon: Compass, bg: 'bg-tertiary text-tertiary-foreground', label: 'Activities' },
  lodging: { icon: Home, bg: 'bg-warning/10 text-warning', label: 'Lodging' },
  other: { icon: ShoppingCart, bg: 'bg-muted text-muted-foreground', label: 'Other' },
};

export default function AllExpensePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // Filters state (simplified for now, matching the UI)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [payerFilter, setPayerFilter] = useState<string | null>(null);

  const { data: trip, isLoading: isTripLoading } = useTrip(id);
  const {
    data: finances,
    isLoading: isFinancesLoading,
    refresh: refreshFinances,
  } = useTripFinances(id, false);

  const isLoading = isTripLoading || isFinancesLoading;

  const filteredExpenses = useMemo(() => {
    if (!finances?.expenses) return [];
    return finances.expenses.filter((exp) => {
      const matchesSearch =
        exp.description.toLowerCase().includes(search.toLowerCase()) ||
        exp.payerName.toLowerCase().includes(search.toLowerCase());

      const matchesCategory = !categoryFilter || exp.category === categoryFilter;
      const matchesPayer = !payerFilter || exp.paid_by_id === payerFilter;

      return matchesSearch && matchesCategory && matchesPayer;
    });
  }, [finances?.expenses, search, categoryFilter, payerFilter]);

  const groupedExpenses = useMemo(() => {
    const groups: Record<string, HydratedExpense[]> = {};

    filteredExpenses.forEach((exp) => {
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
        label = `TODAY, ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()}`;
      } else if (date.toDateString() === yesterday.toDateString()) {
        label = `YESTERDAY, ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()}`;
      }

      if (!groups[label]) groups[label] = [];
      groups[label].push(exp);
    });

    return groups;
  }, [filteredExpenses]);

  const handleRecordExpenseSubmit = async (values: any) => {
    if (!id) return;
    setIsSubmittingExpense(true);
    setErrorMsg(null);
    try {
      await createExpense({
        ...values,
        tripId: id,
      });
      await refreshFinances();
      setCreateOpen(false);
    } catch (err) {
      console.error('[finances] failed to record expense', err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save expense');
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to={`/trips/${id}/finances`}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Finance Dashboard
        </Link>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-2 rounded-full px-6 h-12 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
        >
          <Plus className="h-5 w-5" />
          Record Expense
        </Button>
      </div>

      <h1 className="text-foreground font-headline text-4xl font-extrabold tracking-tight">
        All Expenses
      </h1>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search merchants or payers..."
            className="pl-10 h-12 rounded-xl bg-[#f8f9fa] border-none shadow-sm focus-visible:ring-1 focus-visible:ring-[#005f42]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
          <Button
            variant="outline"
            className="rounded-full h-10 gap-2 text-xs font-semibold bg-[#f8f9fa] border-none shadow-sm"
          >
            <Filter className="h-3.5 w-3.5" />
            Category
          </Button>
          <Button
            variant="outline"
            className="rounded-full h-10 gap-2 text-xs font-semibold bg-[#f8f9fa] border-none shadow-sm"
          >
            <Calendar className="h-3.5 w-3.5" />
            Date Range
          </Button>
          <Button
            variant="outline"
            className="rounded-full h-10 gap-2 text-xs font-semibold bg-[#f8f9fa] border-none shadow-sm"
          >
            <User className="h-3.5 w-3.5" />
            Payer
          </Button>
        </div>
      </div>

      {/* Expense List */}
      {isLoading ? (
        <div className="space-y-8">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-4 w-32" />
              {[0, 1, 2].map((j) => (
                <Skeleton key={j} className="h-20 rounded-2xl" />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedExpenses).map(([dateLabel, expenses]) => (
            <div key={dateLabel} className="space-y-4">
              <h3 className="text-muted-foreground text-[11px] font-bold tracking-widest uppercase">
                {dateLabel}
              </h3>
              <div className="space-y-3">
                {expenses.map((exp) => {
                  const isExpanded = expandedId === exp.id;
                  const cat =
                    categoryStyles[exp.category as keyof typeof categoryStyles] ||
                    categoryStyles.other;
                  const Icon = cat.icon;

                  return (
                    <div
                      key={exp.id}
                      className="group flex flex-col bg-white rounded-2xl border border-[#e8eaed] shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                    >
                      <div
                        onClick={() => toggleExpand(exp.id)}
                        className="flex items-center justify-between p-4 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${cat.bg}`}
                          >
                            <Icon className="w-6 h-6" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-foreground font-bold text-lg leading-none">
                              {exp.description}
                            </h4>
                            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                              <span>
                                {exp.paid_by_id === user?.id ? 'You' : exp.payerName} paid
                              </span>
                              <span className="opacity-40">•</span>
                              <span className="bg-tertiary/50 text-tertiary-foreground px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-tertiary">
                                {exp.split_method === 'equally' ? 'Equally' : 'Exact Amount'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-foreground font-headline text-xl font-extrabold">
                            $
                            {exp.amount.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-foreground transition-transform rotate-180" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                          )}
                        </div>
                      </div>

                      {/* Split Details Section */}
                      {isExpanded && (
                        <div className="bg-[#f8f9fa] border-t border-[#e8eaed] px-4 py-4 sm:px-6 space-y-4">
                          <div className="flex justify-between items-center text-[10px] font-bold tracking-widest text-[#5f6368] uppercase">
                            <span>Split Details ({exp.splits.length} People)</span>
                          </div>
                          <div className="space-y-2">
                            {exp.splits.map((split) => {
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
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-inner ${
                                          isPayer ? 'bg-[#005f42]' : 'bg-[#5f6368]'
                                        }`}
                                      >
                                        {initials}
                                      </div>
                                    )}
                                    <div className="flex flex-col">
                                      <span className="text-foreground font-bold text-sm">
                                        {split.user_id === user?.id ? 'You' : split.userName}
                                        {isPayer && (
                                          <span className="text-[#5f6368] font-medium text-[11px] ml-2">
                                            (Payer)
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-foreground font-bold text-sm">
                                    $
                                    {split.amount.toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredExpenses.length === 0 && (
            <div className="text-center py-20 bg-[#f8f9fa] rounded-3xl border border-dashed border-border">
              <p className="text-muted-foreground font-medium">
                No expenses found matching your search.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {createOpen && trip && (
        <CreateExpenseModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          members={trip.members}
          currentUserId={user?.id || ''}
          onSubmit={handleRecordExpenseSubmit}
          isSubmitting={isSubmittingExpense}
        />
      )}
    </div>
  );
}
