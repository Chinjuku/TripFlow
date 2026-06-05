import React from 'react';
import {
  CreditCard,
  ChevronDown,
  ChevronUp,
  Check,
  Coffee,
  Car,
  Home,
  Compass,
  ShoppingBag,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { DebtRelation, Transaction } from '@/types/finances';

export type { Transaction };

export interface Creditor {
  id: string;
  name: string;
  avatar: string;
  amountOwed: number;
  transactions: Transaction[];
  rawDebtRelation: DebtRelation;
  hasPendingSettlement: boolean;
}

interface CreditorCardProps {
  creditor: Creditor;
  isOptimized: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onSettleUp: (debtRelation: DebtRelation) => void;
}

export function CreditorCard({
  creditor,
  isOptimized,
  isExpanded,
  onToggle,
  onSettleUp,
}: CreditorCardProps) {
  const { t } = useTranslation();

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'food':
        return <Coffee className="w-4 h-4 text-amber-500" />;
      case 'transport':
        return <Car className="w-4 h-4 text-blue-500" />;
      case 'lodging':
      case 'accommodation':
        return <Home className="w-4 h-4 text-purple-500" />;
      case 'activity':
        return <Compass className="w-4 h-4 text-emerald-500" />;
      default:
        return <ShoppingBag className="w-4 h-4 text-rose-500" />;
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col h-fit">
      <div className="p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden border border-border shrink-0">
            {creditor.avatar ? (
              <img
                src={creditor.avatar}
                alt={creditor.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-destructive/10 text-destructive font-bold text-sm dark:bg-destructive/20">
                {creditor.name.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <h3 className="font-headline font-bold text-foreground text-base">{creditor.name}</h3>
            <p className="text-destructive text-xs font-semibold mt-0.5 font-label">
              {t('finances.youOwe')} ฿
              {creditor.amountOwed.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>

        {/* Settle Up Button / Paid Status */}
        {creditor.hasPendingSettlement ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 cursor-default transition-all font-label dark:bg-emerald-500/20 dark:text-emerald-400">
            <Check className="w-3.5 h-3.5" />
            {t('finances.paid', 'จ่ายแล้ว')}
          </div>
        ) : (
          <button
            onClick={() => onSettleUp(creditor.rawDebtRelation)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all font-label cursor-pointer shadow-sm"
          >
            <CreditCard className="w-3.5 h-3.5" />
            {t('finances.settleUp')}
          </button>
        )}
      </div>

      {/* Accordion Divider & Toggle Button */}
      <div className="border-t border-border bg-muted/20 dark:bg-muted/10">
        <button
          onClick={onToggle}
          className="w-full px-5 py-3 text-xs font-bold text-muted-foreground hover:text-foreground flex items-center justify-between transition-colors cursor-pointer font-label"
        >
          <span>
            {isOptimized
              ? t('finances.viewUnderlyingSplits', { count: creditor.transactions.length })
              : t('finances.viewTransactions', { count: creditor.transactions.length })}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {/* Accordion Content */}
        {isExpanded && (
          <div className="px-5 pb-5 pt-1 space-y-2 bg-card animate-in slide-in-from-top-2 duration-200">
            {creditor.transactions.length === 0 ? (
              <p className="text-muted-foreground text-xs py-2 italic font-label">
                {t('finances.noTransactionRecords')}
              </p>
            ) : (
              creditor.transactions.map((tx) => (
                <div
                  key={tx.id}
                  className={`flex items-center justify-between p-3 rounded-xl transition-all border ${
                    tx.amount < 0
                      ? 'bg-primary/5 dark:bg-primary/10 border-primary/20 hover:border-primary/30'
                      : 'bg-muted/30 border-border/40 hover:border-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-card border border-border/80 shadow-sm shrink-0">
                      {getCategoryIcon(tx.category)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-foreground truncate">
                        {tx.description}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium font-label">
                        {tx.date}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`font-headline font-bold text-xs whitespace-nowrap ${tx.amount > 0 ? 'text-destructive' : 'text-primary'}`}
                  >
                    {tx.amount > 0 ? '-' : '+'}฿
                    {Math.abs(tx.amount).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
