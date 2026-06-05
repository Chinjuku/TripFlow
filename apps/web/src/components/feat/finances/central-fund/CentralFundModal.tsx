import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { updateCentralFund } from '@/api/finances';

interface CentralFundModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  members: { userId: string; name: string }[];
  currentTreasurerId: string | null;
  currentPerPerson: number | null;
  onSuccess: () => void;
  suggestedPerPerson?: number; // From budget
}

export function CentralFundModal({
  isOpen,
  onOpenChange,
  tripId,
  members,
  currentTreasurerId,
  currentPerPerson,
  onSuccess,
  suggestedPerPerson,
}: CentralFundModalProps) {
  const { t } = useTranslation();
  const [treasurerId, setTreasurerId] = useState<string>(currentTreasurerId || '');
  const [perPerson, setPerPerson] = useState<string>(
    currentPerPerson ? currentPerPerson.toString() : '',
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // When opened, reset to current if not set
  React.useEffect(() => {
    if (isOpen) {
      setTreasurerId(currentTreasurerId || '');
      setPerPerson(currentPerPerson ? currentPerPerson.toString() : '');
      setError('');
    }
  }, [isOpen, currentTreasurerId, currentPerPerson]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!treasurerId || !perPerson) {
      setError(t('finances.centralFund.errorRequiredFields', 'Please select a treasurer and enter amount per person.'));
      return;
    }

    const numAmount = parseFloat(perPerson);
    if (isNaN(numAmount) || numAmount < 0) {
      setError(t('finances.centralFund.errorInvalidAmount', 'Invalid amount.'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      await updateCentralFund({
        tripId,
        treasurerId,
        centralFundPerPerson: numAmount,
      });
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || t('finances.centralFund.errorFailedUpdate', 'Failed to update central fund.'));
    } finally {
      setLoading(false);
    }
  };

  const applySuggested = () => {
    if (suggestedPerPerson) {
      setPerPerson(suggestedPerPerson.toString());
    }
  };

  return (
    <Modal
      open={isOpen}
      onOpenChange={onOpenChange}
      title={t('finances.centralFund.configureTitle', 'Configure Central Fund')}
      description={t('finances.centralFund.configureDesc', 'Set up a central fund to manage shared group expenses. The trip owner can assign a treasurer.')}
      className="sm:max-w-md font-sans"
    >
      <div className="space-y-4 pt-2">
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {error && <div className="text-destructive text-sm font-medium">{error}</div>}

          <div className="space-y-2">
            <Label>{t('finances.centralFund.treasurerLabel', 'Treasurer')}</Label>
            <select
              value={treasurerId}
              onChange={(e) => setTreasurerId(e.target.value)}
              className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none text-foreground font-semibold"
            >
              <option value="" disabled>
                {t('finances.centralFund.selectTreasurer', 'Select a treasurer')}
              </option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>{t('finances.centralFund.amountPerPersonLabel', 'Amount per Person (฿)')}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 500"
                value={perPerson}
                onChange={(e) => setPerPerson(e.target.value)}
              />
              {suggestedPerPerson !== undefined && suggestedPerPerson > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={applySuggested}>
                  {t('finances.centralFund.suggestAmount', 'Suggest ฿{{amount}}', { amount: suggestedPerPerson.toFixed(0) })}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('finances.centralFund.amountDesc', 'This amount will be used to calculate the total central fund size.')}
            </p>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('common.saving', 'Saving...') : t('finances.centralFund.saveConfiguration', 'Save Configuration')}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
