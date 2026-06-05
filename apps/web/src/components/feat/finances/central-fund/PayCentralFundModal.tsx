import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Store,
  Calendar,
  Banknote,
  Tag,
  Loader2,
  CloudUpload,
  Check,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { extractReceipt } from '@/api/finances';
import type { CreateExpensePayload } from '@/types/finances';

interface PayCentralFundModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: { userId: string }[];
  treasurerId: string;
  remainingCentralFund: number;
  onSubmit: (values: Omit<CreateExpensePayload, 'tripId'>) => Promise<void>;
  isSubmitting: boolean;
}

export function PayCentralFundModal({
  open,
  onOpenChange,
  members,
  treasurerId,
  remainingCentralFund,
  onSubmit,
  isSubmitting,
}: PayCentralFundModalProps) {
  const { t } = useTranslation();

  // OCR Scan state variables
  const [isScanning, setIsScanning] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string } | null>(null);
  const [isAutofilled, setIsAutofilled] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const tzOffset = new Date().getTimezoneOffset() * 60000;
  const localISOTime = new Date(Date.now() - tzOffset).toISOString().substring(0, 16);

  const schema = z.object({
    description: z.string().min(1, 'Description is required').max(120),
    amount: z
      .number()
      .min(0.01)
      .max(
        remainingCentralFund,
        `Cannot exceed remaining central fund (฿${remainingCentralFund.toLocaleString()})`,
      ),
    category: z.enum(['food', 'transport', 'activity', 'lodging', 'other']),
    expenseDate: z.string().min(1),
  });

  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: '',
      amount: 0,
      category: 'food',
      expenseDate: localISOTime,
    },
  });

  // Reset OCR state when modal is closed
  useEffect(() => {
    if (!open) {
      setUploadedFile(null);
      setIsScanning(false);
      setIsAutofilled(false);
      setScanError(null);
    }
  }, [open]);

  // OCR Receipt upload & parsing handler
  const handleReceiptUpload = async (
    e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>,
  ) => {
    let file: File | null = null;

    if ('files' in e.target && e.target.files) {
      file = e.target.files[0] || null;
    } else if ('dataTransfer' in e && e.dataTransfer.files) {
      e.preventDefault();
      file = e.dataTransfer.files[0] || null;
    }

    if (!file) return;

    // Set file details
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    setUploadedFile({ name: file.name, size: `${sizeInMB} MB` });
    setIsScanning(true);
    setIsAutofilled(false);
    setScanError(null);

    try {
      const result = await extractReceipt(file);
      setIsAutofilled(true);

      if (result.merchant) setValue('description', result.merchant);
      if (result.amount) setValue('amount', result.amount);
      if (result.datetime) setValue('expenseDate', result.datetime);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Failed to extract receipt data');
    } finally {
      setIsScanning(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleFormSubmit = async (data: FormValues) => {
    const equalShare = Number((data.amount / members.length).toFixed(2));
    const remainder = Number((data.amount - equalShare * members.length).toFixed(2));

    const splits = members.map((m, index) => {
      let finalAmount = equalShare;
      if (index === 0) {
        finalAmount = Number((equalShare + remainder).toFixed(2));
      }
      return {
        userId: m.userId,
        amount: finalAmount,
        itemPaid: null,
      };
    });

    await onSubmit({
      description: data.description,
      amount: data.amount,
      paidById: treasurerId,
      category: data.category,
      splitMethod: 'equally',
      expenseDate: data.expenseDate,
      isCentralFund: true,
      splits,
    });
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t('finances.centralFund.payTitle', 'Pay from Central Fund')}
      description={t(
        'finances.centralFund.payDesc',
        'Record an expense paid using the central fund.',
      )}
      className="sm:max-w-md"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 pt-4">
        {/* OCR Dropzone */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleReceiptUpload}
          className="relative group cursor-pointer border-2 border-dashed border-border hover:border-primary/50 rounded-2xl p-6 bg-muted/50 text-center transition-all duration-200"
        >
          <input
            id="receipt-upload"
            type="file"
            accept="image/*,application/pdf"
            onChange={handleReceiptUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform duration-200">
              {isScanning ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <CloudUpload className="w-6 h-6" />
              )}
            </div>
            {isScanning ? (
              <div className="space-y-1.5 z-20">
                <p className="text-sm font-semibold text-muted-foreground">
                  {t('finances.scanningReceipt', 'Scanning receipt...')}
                </p>
                <div className="w-48 h-1.5 bg-muted rounded-full mx-auto overflow-hidden">
                  <div className="h-full bg-primary animate-infinite-loading rounded-full" />
                </div>
              </div>
            ) : uploadedFile ? (
              <div className="z-20">
                <p className="text-sm font-semibold text-primary flex items-center gap-1.5 justify-center">
                  <Check className="w-4 h-4" />{' '}
                  {t('finances.receiptLoaded', 'Receipt loaded successfully')}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {uploadedFile.name} ({uploadedFile.size})
                </p>
              </div>
            ) : (
              <div className="z-20">
                <p className="text-sm font-semibold text-muted-foreground">
                  {t('finances.uploadReceipt', 'Upload receipt / slip to auto-fill')}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('finances.uploadReceiptFormat', 'Support images or PDF')}
                </p>
              </div>
            )}
          </div>
        </div>

        {scanError && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{scanError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-bold text-muted-foreground">
              {t('finances.merchant', 'Merchant')}
            </Label>
            <div className="relative">
              <Input
                id="description"
                placeholder="e.g. Nara Thai Cuisine"
                className={`pl-9 h-11 border-input bg-background rounded-xl focus-visible:ring-primary text-sm ${
                  errors.description ? 'border-destructive' : ''
                }`}
                {...register('description')}
              />
              <Store className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
            </div>
            {errors.description && (
              <p className="text-destructive text-[11px] mt-0.5">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="expenseDate" className="text-xs font-bold text-muted-foreground">
              {t('finances.expenseDate', 'Expense Date')}
            </Label>
            <div className="relative">
              <Input
                id="expenseDate"
                type="datetime-local"
                className="pl-9 h-11 border-input bg-background rounded-xl focus-visible:ring-primary text-sm"
                {...register('expenseDate')}
              />
              <Calendar className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
            </div>
            {errors.expenseDate && (
              <p className="text-destructive text-[11px] mt-0.5">{errors.expenseDate.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="amount" className="text-xs font-bold text-muted-foreground">
            {t('finances.totalAmountThb', 'Total Amount (THB)')}
          </Label>
          <div className="relative flex items-center">
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              className={`pl-14 h-14 border-input bg-background rounded-xl focus-visible:ring-primary text-2xl font-bold tracking-tight text-foreground ${
                errors.amount ? 'border-destructive' : ''
              }`}
              {...register('amount', { valueAsNumber: true })}
            />
            <div className="absolute left-4 flex items-center gap-1.5 text-muted-foreground">
              <Banknote className="w-5 h-5 text-primary" />
              <span className="text-lg font-bold text-foreground">฿</span>
            </div>
          </div>
          {errors.amount && (
            <p className="text-destructive text-[11px] mt-0.5">{errors.amount.message}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {t('finances.centralFund.remainingLabel', 'Remaining:')}{' '}
            <span className="font-bold">
              ฿{remainingCentralFund.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="category" className="text-xs font-bold text-muted-foreground">
            {t('finances.categoryLabel', 'Category')}
          </Label>
          <div className="relative">
            <select
              id="category"
              className="flex h-11 w-full rounded-xl border border-input bg-background px-3 pl-9 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-foreground font-semibold"
              {...register('category')}
            >
              <option value="food">{t('finances.categoryFoodLabel', 'Food & Dining')}</option>
              <option value="transport">
                {t('finances.categoryTransportLabel', 'Transportation')}
              </option>
              <option value="activity">{t('finances.categoryActivityLabel', 'Activities')}</option>
              <option value="lodging">{t('finances.categoryLodgingLabel', 'Lodging')}</option>
              <option value="other">{t('finances.categoryOtherLabel', 'Other')}</option>
            </select>
            <Tag className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
          </div>
          {errors.category && (
            <p className="text-destructive text-[11px] mt-0.5">{errors.category.message}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-sm transition-all"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            t('finances.recordExpense', 'Record Expense')
          )}
        </Button>
      </form>
    </Modal>
  );
}
