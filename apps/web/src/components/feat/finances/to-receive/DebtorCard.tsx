import React from 'react';
import {
  Bell,
  ChevronDown,
  ChevronUp,
  Check,
  Coffee,
  Car,
  Home,
  Compass,
  ShoppingBag,
  CheckCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface Transaction {
  id: string;
  description: string;
  date: string;
  amount: number;
  category: 'food' | 'transport' | 'accommodation' | 'activity' | 'shopping' | 'lodging' | 'other';
}

export interface Debtor {
  id: string;
  name: string;
  avatar: string;
  amountOwed: number;
  transactions: Transaction[];
  hasPendingSettlement: boolean;
  pendingSettlementId: string | null;
}

interface DebtorCardProps {
  debtor: Debtor;
  isOptimized: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onConfirmSettlement: (pendingSettlementId: string, debtorName: string) => Promise<void>;
  confirmingSettlementId: string | null;
  isReminded: boolean;
  onRemind: (debtorName: string, debtorId: string) => void;
}

export function DebtorCard({
  debtor,
  isOptimized,
  isExpanded,
  onToggle,
  onConfirmSettlement,
  confirmingSettlementId,
  isReminded,
  onRemind,
}: DebtorCardProps) {
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
            {debtor.avatar ? (
              <img
                src={debtor.avatar}
                alt={debtor.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-sm dark:bg-primary/20">
                {debtor.name.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <h3 className="font-headline font-bold text-foreground text-base">
              {debtor.name}
            </h3>
            <p className="text-primary text-xs font-semibold mt-0.5 font-label">
              {t('finances.owesYou')} ฿{debtor.amountOwed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {debtor.hasPendingSettlement ? (
            <button
              onClick={async () => {
                if (debtor.pendingSettlementId) {
                  await onConfirmSettlement(debtor.pendingSettlementId, debtor.name);
                }
              }}
              disabled={confirmingSettlementId === debtor.pendingSettlementId}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs bg-[#059669] text-white hover:bg-[#047857] transition-all font-label shadow-sm dark:bg-[#10B981]/20 dark:text-[#34D399] dark:border dark:border-[#10B981]/30 dark:hover:bg-[#10B981]/30 animate-in fade-in disabled:opacity-50 disabled:pointer-events-none"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              {confirmingSettlementId === debtor.pendingSettlementId
                ? t('finances.confirming', 'กำลังยืนยัน...')
                : t('finances.confirmPaid', 'รับเงินแล้ว')}
            </button>
          ) : (
            <button
              onClick={() => onRemind(debtor.name, debtor.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs transition-all font-label animate-in fade-in ${
                isReminded
                  ? 'bg-primary/10 text-primary dark:bg-primary/20'
                  : 'bg-muted hover:bg-accent text-primary'
              }`}
            >
              {isReminded ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  {t('finances.reminded')}
                </>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5" />
                  {t('finances.remind')}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Accordion Divider & Toggle Button */}
      <div className="border-t border-border bg-muted/20 dark:bg-muted/10">
        <button
          onClick={onToggle}
          className="w-full px-5 py-3 text-xs font-bold text-muted-foreground hover:text-foreground flex items-center justify-between transition-colors cursor-pointer font-label"
        >
          <span>
            {isOptimized
              ? t('finances.viewUnderlyingSplits', { count: debtor.transactions.length })
              : t('finances.viewTransactions', { count: debtor.transactions.length })}
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
            {debtor.transactions.length === 0 ? (
              <p className="text-muted-foreground text-xs py-2 italic font-label">{t('finances.noTransactionRecords')}</p>
            ) : (
              debtor.transactions.map((tx) => (
                <div
                  key={tx.id}
                  className={`flex items-center justify-between p-3 rounded-xl transition-all border ${
                    tx.amount < 0
                      ? 'bg-destructive/5 dark:bg-destructive/10 border-destructive/20 hover:border-destructive/30'
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
                  <span className={`font-headline font-bold text-xs whitespace-nowrap ${tx.amount > 0 ? 'text-primary' : 'text-destructive'}`}>
                    {tx.amount > 0 ? '+' : '-'}฿{Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
