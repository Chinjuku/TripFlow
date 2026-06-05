import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function SettlementHelpNote() {
  const { t } = useTranslation();

  return (
    <div className="bg-primary/[0.03] border border-primary/10 rounded-2xl p-5 flex gap-3 text-xs md:text-sm shadow-sm shrink-0">
      <AlertCircle className="w-5 h-5 text-primary shrink-0" />
      <div className="space-y-1">
        <h4 className="font-bold text-foreground font-headline">
          {t('finances.aboutAutomaticSettlements')}
        </h4>
        <p className="font-medium text-muted-foreground leading-relaxed">
          {t('finances.automaticSettlementsDesc')}
        </p>
      </div>
    </div>
  );
}
