import { User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BankSelect } from '@/components/shared/form/BankSelect';

interface BankFormProps {
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  onBankNameChange: (value: string) => void;
  onBankAccountNumberChange: (value: string) => void;
  onBankAccountNameChange: (value: string) => void;
}

/** Mobile-banking fields: bank, account number, account holder name. */
export function BankForm({
  bankName,
  bankAccountNumber,
  bankAccountName,
  onBankNameChange,
  onBankAccountNumberChange,
  onBankAccountNameChange,
}: BankFormProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="bankName">{t('settings.bankName')}</Label>
          <BankSelect
            id="bankName"
            value={bankName}
            onChange={onBankNameChange}
            placeholder={t('settings.bankNamePlaceholder')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bankAccountNumber">{t('settings.bankAccountNumber')}</Label>
          <Input
            id="bankAccountNumber"
            placeholder={t('settings.bankAccountNumberPlaceholder')}
            value={bankAccountNumber}
            onChange={(e) => onBankAccountNumberChange(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bankAccountName">{t('settings.accountHolderName')}</Label>
        <div className="relative">
          <Input
            id="bankAccountName"
            placeholder={t('settings.accountHolderNamePlaceholder')}
            value={bankAccountName}
            onChange={(e) => onBankAccountNameChange(e.target.value)}
            className="pl-10"
          />
          <User
            className="text-muted-foreground absolute left-3 top-2.5 h-5 w-5"
            strokeWidth={1.75}
          />
        </div>
      </div>
    </div>
  );
}
