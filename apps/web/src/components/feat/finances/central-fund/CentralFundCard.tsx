import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Landmark, Settings2, PlusCircle } from 'lucide-react';
import { Card, CardContent } from '@trip-flow/ui/components/card';
import { Button } from '@trip-flow/ui/components/button';
import { CentralFundModal } from './CentralFundModal';
import type { FinanceSummary } from '../types';

interface CentralFundCardProps {
  tripId: string;
  summary: FinanceSummary;
  members: { userId: string; name: string }[];
  isOwner: boolean;
  onRefresh: () => void;
}

export function CentralFundCard({
  tripId,
  summary,
  members,
  isOwner,
  onRefresh,
}: CentralFundCardProps) {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);

  const isConfigured =
    summary.treasurerId != null &&
    summary.centralFundPerPerson != null &&
    summary.centralFundTotal > 0;

  const remaining = summary.centralFundTotal - summary.centralFundSpent;
  const progressPercent =
    summary.centralFundTotal > 0
      ? Math.min(100, Math.round((summary.centralFundSpent / summary.centralFundTotal) * 100))
      : 0;

  const suggestedPerPerson =
    summary.budget && summary.budget.amount > 0 && members.length > 0
      ? summary.budget.amount / members.length
      : undefined;

  const targetPool =
    summary.centralFundPerPerson && members.length > 0
      ? summary.centralFundPerPerson * members.length
      : 0;

  const budgetPercent =
    targetPool > 0 && summary.budget && summary.budget.amount > 0
      ? Math.round((targetPool / summary.budget.amount) * 100)
      : 0;

  return (
    <>
      <Card className="rounded-2xl border-primary/20 bg-gradient-to-br from-primary/[0.05] to-transparent shadow-sm overflow-hidden relative group transition-all duration-300 hover:shadow-md dark:from-primary/[0.02]">
        <div className="absolute -top-4 -right-4 p-6 opacity-[0.04] group-hover:scale-110 transition-transform duration-300 pointer-events-none">
          <Landmark className="w-40 h-40 text-primary" />
        </div>
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2 text-primary text-[10px] font-bold tracking-wider uppercase font-label">
              <Landmark className="h-4 w-4" />
              {t('finances.centralFund.title', 'Central Fund')}
            </div>
            {isOwner && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-primary z-10"
                onClick={() => setModalOpen(true)}
              >
                <Settings2 className="w-3.5 h-3.5 mr-1.5" />
                {t('finances.centralFund.configure', 'Configure')}
              </Button>
            )}
          </div>

          {!isConfigured ? (
            <div className="flex flex-col items-center justify-center py-6 text-center z-10 relative">
              <p className="text-sm text-muted-foreground mb-4">
                {t('finances.centralFund.notConfiguredDesc', 'No central fund configured. Pool money together for shared expenses.')}
              </p>
              {isOwner ? (
                <Button onClick={() => setModalOpen(true)} variant="outline" className="gap-2">
                  <PlusCircle className="w-4 h-4" />
                  {t('finances.centralFund.setUp', 'Set up Central Fund')}
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  {t('finances.centralFund.ownerOnly', 'Only the trip owner can set this up.')}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-6 z-10 relative">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-muted-foreground text-xs font-medium">
                    {t('finances.centralFund.totalPool', 'Total Pool')}
                  </div>
                  <div className="text-foreground text-2xl font-bold">
                    ฿
                    {summary.centralFundTotal.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <div className="text-muted-foreground text-[10px]">
                    ฿{summary.centralFundPerPerson?.toLocaleString()} {t('finances.centralFund.perPerson', 'per person')}
                    {targetPool > 0 && ` • ${t('finances.centralFund.target', { amount: targetPool.toLocaleString() })}`}
                    {budgetPercent > 0 && ` ${t('finances.centralFund.percentOfBudget', { percent: budgetPercent })}`}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-muted-foreground text-xs font-medium">
                    {t('finances.centralFund.remaining', 'Remaining')}
                  </div>
                  <div
                    className={`text-2xl font-bold ${remaining < 0 ? 'text-destructive' : 'text-emerald-500'}`}
                  >
                    ฿
                    {remaining.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2 pt-2">
                <div className="bg-muted h-2.5 w-full rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                      progressPercent > 90 ? 'bg-destructive' : 'bg-primary'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-medium">
                    {t('finances.centralFund.percentSpent', '{{percent}}% spent', { percent: progressPercent })}
                  </span>
                  <span className="text-muted-foreground">
                    {t('finances.centralFund.amountUsed', '{{amount}} used', { amount: `฿${summary.centralFundSpent.toLocaleString()}` })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {isOwner && (
        <CentralFundModal
          isOpen={modalOpen}
          onOpenChange={setModalOpen}
          tripId={tripId}
          members={members}
          currentTreasurerId={summary.treasurerId}
          currentPerPerson={summary.centralFundPerPerson}
          onSuccess={onRefresh}
          suggestedPerPerson={suggestedPerPerson}
        />
      )}
    </>
  );
}
