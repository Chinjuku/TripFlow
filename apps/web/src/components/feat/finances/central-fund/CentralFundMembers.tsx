import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import type { HydratedExpense, HydratedSettlement } from '../types';

interface CentralFundMembersProps {
  members: { userId: string; name: string; avatarUrl?: string | null }[];
  treasurerId: string | null;
  centralFundPerPerson: number | null;
  settlements: HydratedSettlement[];
  expenses: HydratedExpense[];
}

export function CentralFundMembers({
  members,
  treasurerId,
  centralFundPerPerson,
  settlements,
  expenses,
}: CentralFundMembersProps) {
  const { t } = useTranslation();

  const memberStatuses = useMemo(() => {
    return members.map((member) => {
      const memberUsedAmount = expenses
        .filter((e) => e.is_central_fund)
        .reduce((sum, e) => {
          const split = e.splits.find((s) => s.user_id === member.userId);
          return sum + (split ? split.amount : 0);
        }, 0);

      if (member.userId === treasurerId) {
        return {
          ...member,
          status: 'treasurer' as const,
          paidAmount: centralFundPerPerson || 0,
          pendingAmount: 0,
          usedAmount: memberUsedAmount,
        };
      }

      const memberSettlements = settlements.filter(
        (s) => s.payer_id === member.userId && s.is_central_fund && s.payee_id === treasurerId,
      );

      const paidAmount = memberSettlements
        .filter((s) => s.status === 'completed')
        .reduce((sum, s) => sum + s.amount, 0);

      const pendingAmount = memberSettlements
        .filter((s) => s.status === 'pending')
        .reduce((sum, s) => sum + s.amount, 0);

      let status: 'paid' | 'pending' | 'unpaid' = 'unpaid';
      const required = centralFundPerPerson || 0;

      if (paidAmount >= required) {
        status = 'paid';
      } else if (paidAmount + pendingAmount >= required) {
        status = 'pending';
      } else if (paidAmount > 0 || pendingAmount > 0) {
        status = 'pending';
      }

      return {
        ...member,
        status,
        paidAmount,
        pendingAmount,
        usedAmount: memberUsedAmount,
      };
    });
  }, [members, treasurerId, centralFundPerPerson, settlements, expenses]);

  if (!centralFundPerPerson || !treasurerId) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="shrink-0 text-sm font-bold text-foreground font-headline uppercase tracking-wider">
        {t('finances.centralFund.memberContributions', 'Member Contributions')}
      </h3>
      <div className="space-y-3">
        {memberStatuses.map((member) => (
          <div
            key={member.userId}
            className="p-4 flex items-center justify-between bg-card border border-border rounded-2xl shadow-sm transition-all hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              {member.avatarUrl ? (
                <img
                  src={member.avatarUrl}
                  alt={member.name}
                  className="w-10 h-10 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                  {member.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="font-semibold text-sm flex items-center gap-2 truncate">
                  <span className="truncate">{member.name}</span>
                  {member.status === 'treasurer' && (
                    <span className="shrink-0 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                      {t('finances.centralFund.treasurer', 'Treasurer')}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 flex flex-col gap-0.5">
                  {member.status === 'treasurer' ? (
                    <span className="italic">
                      {t('finances.centralFund.holdingMoney', 'Holding central fund')}
                    </span>
                  ) : (
                    <span>
                      ฿{member.paidAmount.toLocaleString()} / ฿
                      {centralFundPerPerson.toLocaleString()}
                    </span>
                  )}
                  {member.usedAmount > 0 && (
                    <span className="text-[10px] text-rose-500/80 font-medium flex items-center gap-1">
                      <span>
                        Spent: ฿
                        {member.usedAmount.toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="shrink-0 flex items-center pl-2">
              {member.status === 'treasurer' || member.status === 'paid' ? (
                <div className="flex flex-col items-end gap-0.5">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <span className="text-[9px] font-bold text-primary uppercase tracking-wider">
                    {t('finances.centralFund.paid', 'Paid')}
                  </span>
                </div>
              ) : member.status === 'pending' ? (
                <div className="flex flex-col items-end gap-0.5">
                  <Clock className="w-5 h-5 text-amber-500" />
                  <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">
                    {t('finances.pending', 'Pending')}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-end gap-0.5 opacity-50">
                  <Circle className="w-5 h-5 text-muted-foreground" />
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                    {t('finances.centralFund.unpaid', 'Unpaid')}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
