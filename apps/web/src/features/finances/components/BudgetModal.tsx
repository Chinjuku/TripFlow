import React, { useState } from 'react';
import { Modal } from '@trip-flow/ui/components/modal';
import { Input } from '@trip-flow/ui/components/input';
import { Label } from '@trip-flow/ui/components/label';
import { Button } from '@trip-flow/ui/components/button';
import { Wallet } from 'lucide-react';

interface BudgetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialAmount: number;
  onSubmit: (amount: number) => Promise<void>;
  isSubmitting: boolean;
}

export function BudgetModal({
  open,
  onOpenChange,
  initialAmount,
  onSubmit,
  isSubmitting,
}: BudgetModalProps) {
  const [amount, setAmount] = useState(initialAmount || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(amount);
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Set Trip Budget"
      description="Define the total budget threshold for this journey."
      className="sm:max-w-sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div className="space-y-1">
          <Label htmlFor="budget-amount" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Budget Limit (USD)
          </Label>
          <div className="relative">
            <Input
              id="budget-amount"
              type="number"
              step="0.01"
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="e.g. 5000.00"
              className="pl-9 border-border"
              required
            />
            <Wallet className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="text-xs h-9 px-4 rounded-xl border border-border hover:bg-muted font-bold transition-colors"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs h-9 px-5 rounded-xl font-bold shadow-sm shadow-emerald-600/10 transition-colors"
          >
            {isSubmitting ? 'Saving...' : 'Save Budget'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
