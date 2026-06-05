import React from 'react';
import { ChevronDown, Utensils, Car, Compass, Home, Banknote } from 'lucide-react';
import type { HydratedExpense, HydratedExpenseSplit } from '@/types/finances';
import { useTranslation } from 'react-i18next';

interface AllExpenseItemProps {
  expense: HydratedExpense;
  currentUserId: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const categoryStyles = {
  food: {
    icon: Utensils,
    bg: 'bg-purple-100/70 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300',
  },
  transport: { icon: Car, bg: 'bg-primary/10 text-primary' },
  activity: { icon: Compass, bg: 'bg-warning/10 text-warning' },
  lodging: { icon: Home, bg: 'bg-sky-100/70 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300' },
  other: { icon: Banknote, bg: 'bg-muted text-muted-foreground' },
};

export function AllExpenseItem({
  expense: exp,
  currentUserId,
  isExpanded,
  onToggleExpand,
}: AllExpenseItemProps) {
  const { t } = useTranslation();
  const catKey = exp.category as keyof typeof categoryStyles;
  const cat = categoryStyles[catKey] || categoryStyles.other;
  const Icon = cat.icon;

  const isPaidByMe = exp.paid_by_id === currentUserId;

  const splitLabel =
    exp.split_method === 'equally'
      ? t('finances.equally', 'Equally')
      : t('finances.exactAmount', 'Exact Amount');

  return (
    <div className="group flex flex-col bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      <div
        onClick={onToggleExpand}
        className="flex items-center justify-between p-4 cursor-pointer select-none"
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${cat.bg}`}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-foreground font-bold text-sm sm:text-base leading-tight">
              {exp.description}
            </h4>
            <div className="flex flex-wrap items-center gap-1.5 text-muted-foreground text-xs">
              <span>
                {t('finances.paidBy')} {isPaidByMe ? t('common.you') : exp.payerName}
              </span>
              <span className="opacity-40">•</span>
              <span className="bg-tertiary/50 text-tertiary-foreground px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-tertiary">
                {splitLabel}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-foreground font-headline text-base font-extrabold">
            ฿
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
        <div className="bg-muted/30 border-t border-border px-4 py-4 sm:px-5 space-y-4">
          <div className="flex justify-between items-center text-[10px] font-bold tracking-wider text-muted-foreground uppercase font-label">
            <span>
              {t('finances.splitBreakdown')} ({exp.splits.length} {t('common.people')})
            </span>
          </div>
          <div className="space-y-2">
            {exp.splits.map((split: HydratedExpenseSplit) => {
              const isPayer = split.user_id === exp.paid_by_id;
              const isSplitMe = split.user_id === currentUserId;
              const initials = split.userName
                .split(' ')
                .map((n: string) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);

              return (
                <div
                  key={split.id}
                  className={`flex items-center justify-between p-3 rounded-xl border shadow-sm ${
                    isPayer ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {split.avatarUrl ? (
                      <img
                        src={split.avatarUrl}
                        alt={split.userName}
                        className={`w-8 h-8 rounded-full object-cover border ${isPayer ? 'border-primary ring-2 ring-primary/20' : 'border-border'}`}
                      />
                    ) : (
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-inner ${
                          isPayer ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground text-white'
                        }`}
                      >
                        {initials}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span
                        className={`font-medium text-sm ${isSplitMe ? 'text-primary font-semibold' : 'text-foreground'}`}
                      >
                        {isSplitMe ? t('common.you') : split.userName}
                        {isPayer && (
                          <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-primary/20 ml-2">
                            {t('finances.payer', 'Payer')}
                          </span>
                        )}
                      </span>
                      {exp.split_method === 'exact_amount' && split.item_paid && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {split.item_paid.split(',').map((item: string, idx: number) => (
                            <span key={idx} className="bg-muted/50 text-muted-foreground border border-border px-2 py-0.5 rounded-md text-[10px] font-medium shadow-sm">
                              {item.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-foreground font-bold text-sm">
                    ฿
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
}
