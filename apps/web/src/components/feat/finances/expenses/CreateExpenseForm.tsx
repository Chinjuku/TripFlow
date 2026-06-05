import React, { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  AlertCircle,
  Calendar,
  Tag,
  ReceiptText,
  CloudUpload,
  Loader2,
  Sparkles,
  Store,
  Banknote,
  Plus,
  Check,
  X,
  UserPlus,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';
import { extractReceipt } from '@/api/finances';

// Zod schema for validation
const createExpenseSchema = z.object({
  description: z
    .string()
    .min(1, 'Merchant/Description is required')
    .max(120, 'Merchant name is too long'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  paidById: z.string().uuid('Please select who paid'),
  category: z.enum(['food', 'transport', 'activity', 'lodging', 'other']),
  splitMethod: z.enum(['equally', 'exact_amount']),
  expenseDate: z.string().min(1, 'Date is required'),
  splits: z.array(
    z.object({
      userId: z.string().uuid(),
      amount: z.number().min(0),
      itemPaid: z.string().max(100).nullable().optional(),
      checked: z.boolean(),
    }),
  ),
});

type ExpenseFormValues = z.infer<typeof createExpenseSchema>;

interface CreateExpenseFormProps {
  members: { userId: string; name: string; avatarUrl: string | null }[];
  currentUserId: string;
  onSubmit: (values: any) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

// Avatar color helper based on member's name string length/chars to match design screenshots perfectly
const getAvatarBgColor = (name: string) => {
  const code = name.charCodeAt(0) + name.length;
  const colors = [
    'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
    'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
    'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  ];
  return colors[code % colors.length];
};

export function CreateExpenseForm({
  members,
  currentUserId,
  onSubmit,
  onCancel,
  isSubmitting,
}: CreateExpenseFormProps) {
  // OCR Scan state variables
  const [isScanning, setIsScanning] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string } | null>(null);
  const [isAutofilled, setIsAutofilled] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [extractedSenderName, setExtractedSenderName] = useState<string | null>(null);
  const [extractedBankName, setExtractedBankName] = useState<string | null>(null);
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);
  const addPersonRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  // Calculate local timezone ISO string
  const tzOffset = new Date().getTimezoneOffset() * 60000;
  const localISOTime = new Date(Date.now() - tzOffset).toISOString().substring(0, 16);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      description: '',
      amount: 0,
      paidById: currentUserId,
      category: 'food',
      splitMethod: 'equally',
      expenseDate: localISOTime,
      splits: members.map((m) => ({
        userId: m.userId,
        amount: 0,
        itemPaid: '',
        checked: m.userId === currentUserId,
      })),
    },
  });

  const { fields } = useFieldArray({
    control,
    name: 'splits',
  });

  // Watch fields for dynamic split calculations
  const watchAmount = watch('amount') || 0;
  const watchSplitMethod = watch('splitMethod');
  const watchSplits = watch('splits') || [];
  const watchDescription = watch('description') || '';
  const watchPaidById = watch('paidById');

  const checkedCount = watchSplits.filter((s) => s.checked).length;
  const lastDescriptionRef = useRef(watchDescription);

  // Auto-recalculate splits in 'equally' mode when amount or checked items change
  useEffect(() => {
    if (watchSplitMethod === 'equally') {
      const equalShare = checkedCount > 0 ? Number((watchAmount / checkedCount).toFixed(2)) : 0;

      // Distribute remainder (due to rounding) to the first checked member
      let remainder = 0;
      if (checkedCount > 0) {
        remainder = Number((watchAmount - equalShare * checkedCount).toFixed(2));
      }

      let distributedFirst = false;

      watchSplits.forEach((split, index) => {
        if (split.checked) {
          let finalAmount = equalShare;
          if (!distributedFirst) {
            finalAmount = Number((equalShare + remainder).toFixed(2));
            distributedFirst = true;
          }
          setValue(`splits.${index}.amount`, finalAmount);
        } else {
          setValue(`splits.${index}.amount`, 0);
        }
      });
    }
  }, [watchAmount, watchSplitMethod, checkedCount, setValue]);

  // Auto-calculate exact split for the payer (paidById) and default itemPaid to merchant description
  // Auto-calculate exact split for the payer (paidById) and default itemPaid to merchant description
  useEffect(() => {
    if (watchSplitMethod === 'exact_amount') {
      // Find the index of the payer (paidById) in splits
      const payerIndex = watchSplits.findIndex((s) => s.userId === watchPaidById);
      if (payerIndex !== -1) {
        // Ensure the payer is checked/included by default in exact split
        if (!watchSplits[payerIndex]?.checked) {
          setValue(`splits.${payerIndex}.checked`, true);
        }

        // Set default itemPaid to merchant description for the payer if it's empty or needs to match
        if (
          watchDescription &&
          (!watchSplits[payerIndex]?.itemPaid ||
            watchSplits[payerIndex]?.itemPaid === lastDescriptionRef.current)
        ) {
          setValue(`splits.${payerIndex}.itemPaid`, watchDescription);
        }
      }
    }
    lastDescriptionRef.current = watchDescription;
  }, [watchSplitMethod, watchPaidById, watchDescription, setValue, watchSplits]);

  // Handle click outside "+ Add Person" dropdown to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (addPersonRef.current && !addPersonRef.current.contains(event.target as Node)) {
        setIsAddPersonOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Render-time calculations for Exact Amount Split ---
  const exactPayerIndex = watchSplits.findIndex((s) => s.userId === watchPaidById);
  const exactOtherSplitsSum = watchSplits.reduce((sum, s, idx) => {
    if (idx !== exactPayerIndex && s.checked) {
      return sum + (Number(s.amount) || 0);
    }
    return sum;
  }, 0);
  const calculatedPayerAmount = Number(Math.max(0, watchAmount - exactOtherSplitsSum).toFixed(2));

  // Validation: Sum of exact split amounts must match total expense amount
  const exactSplitSum = watchSplits.reduce((sum, s, idx) => {
    if (watchSplitMethod === 'exact_amount' && idx === exactPayerIndex) {
      return sum + calculatedPayerAmount;
    }
    return sum + (s.checked ? Number(s.amount) || 0 : 0);
  }, 0);
  const isExactMismatch =
    watchSplitMethod === 'exact_amount' && Math.abs(exactSplitSum - watchAmount) > 0.05;

  // Simulate receipt upload & OCR parsing
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
    setExtractedSenderName(null);
    setExtractedBankName(null);

    try {
      const result = await extractReceipt(file);
      setIsAutofilled(true);

      if (result.merchant) setValue('description', result.merchant);
      if (result.amount) setValue('amount', result.amount);
      if (result.datetime) setValue('expenseDate', result.datetime);
      if (result.sender_name) setExtractedSenderName(result.sender_name);
      if (result.bank_name) setExtractedBankName(result.bank_name);

      // Auto-match payer from group members
      if (result.sender_name && members.length > 0) {
        const senderLower = result.sender_name.toLowerCase();
        const matchedMember = members.find((m) => {
          const nameLower = m.name.toLowerCase();
          return senderLower.includes(nameLower) || nameLower.includes(senderLower);
        });

        if (matchedMember) {
          setValue('paidById', matchedMember.userId);
        }
      }
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Failed to extract receipt data');
    } finally {
      setIsScanning(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleExcludeTraveler = (index: number) => {
    setValue(`splits.${index}.checked`, false);
    setValue(`splits.${index}.amount`, 0);
    setValue(`splits.${index}.itemPaid`, '');
  };

  const handleIncludeTraveler = (index: number) => {
    setValue(`splits.${index}.checked`, true);
    setIsAddPersonOpen(false);
  };

  const handleAddAll = () => {
    fields.forEach((_, index) => {
      setValue(`splits.${index}.checked`, true);
    });
    setIsAddPersonOpen(false);
  };

  const handleFormSubmit = (data: ExpenseFormValues) => {
    // Filter down to involved splits only
    const activeSplits = data.splits
      .filter((s) => {
        if (data.splitMethod === 'equally') return s.checked;
        if (s.userId === data.paidById) return calculatedPayerAmount > 0;
        return s.amount > 0 && s.checked;
      })
      .map((s) => ({
        userId: s.userId,
        amount:
          data.splitMethod === 'exact_amount' && s.userId === data.paidById
            ? calculatedPayerAmount
            : s.amount,
        itemPaid: data.splitMethod === 'exact_amount' ? s.itemPaid || null : null,
      }));

    if (activeSplits.length === 0) {
      alert(t('finances.errorNoTravelerSelected', 'At least one traveler must be in the split'));
      return;
    }

    if (data.splitMethod === 'exact_amount' && isExactMismatch) {
      alert(
        t('finances.errorExactMismatch', 'Total splits must sum to ฿{{amount}}', {
          amount: data.amount.toLocaleString(),
        })
      );
      return;
    }

    onSubmit({
      description: data.description,
      amount: data.amount,
      paidById: data.paidById,
      category: data.category,
      splitMethod: data.splitMethod,
      expenseDate: localISOTime,
      splits: activeSplits,
    });
  };

  // Excluded travelers selector logic
  const excludedTravelers = fields
    .map((field, idx) => ({ ...field, originalIndex: idx }))
    .filter((field) => !watchSplits[field.originalIndex]?.checked)
    .filter((field) => field.userId !== currentUserId);

  return (
    <div className="flex flex-col bg-background max-h-[90dvh] sm:max-h-[calc(100dvh-4rem)]">
      <style>{`
        @keyframes infinite-loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-infinite-loading {
          animation: infinite-loading 1.5s infinite linear;
        }
        @keyframes slide-down {
          0% { opacity: 0; transform: translateY(-8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down {
          animation: slide-down 0.2s ease-out forwards;
        }
        @keyframes slide-up {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.2s ease-out forwards;
        }
      `}</style>
      {/* Premium Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <ReceiptText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-headline text-lg font-bold text-foreground leading-tight">
              {t('finances.recordAndSplit')}
            </h2>
            <p className="text-xs text-muted-foreground">{t('finances.recordAndSplitDesc')}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className="flex-1 overflow-y-auto p-6 space-y-6"
      >
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
                  {t('finances.scanningReceipt')}
                </p>
                <div className="w-48 h-1.5 bg-muted rounded-full mx-auto overflow-hidden">
                  <div className="h-full bg-primary animate-infinite-loading rounded-full" />
                </div>
              </div>
            ) : uploadedFile ? (
              <div className="z-20">
                <p className="text-sm font-semibold text-primary flex items-center gap-1.5 justify-center">
                  <Check className="w-4 h-4" /> {t('finances.receiptLoaded')}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {uploadedFile.name} ({uploadedFile.size})
                </p>
              </div>
            ) : (
              <div className="z-20">
                <p className="text-sm font-semibold text-muted-foreground">
                  {t('finances.uploadReceipt')}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('finances.uploadReceiptFormat')}
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

        {/* Form Fields Card Block */}
        <div className="relative border border-border rounded-2xl p-5 bg-muted/30 space-y-4">
          {/* Sparkle Autofilled Badge */}
          {isAutofilled && (
            <div className="absolute -top-3 left-4 flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm animate-pulse-once">
              <Sparkles className="w-3 h-3" />
              <span>{t('finances.autoFilled')}</span>
            </div>
          )}

          {/* Merchant & Date */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-bold text-muted-foreground">
                {t('finances.merchant')}
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
                {t('finances.expenseDate')}
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

          {/* Total Amount (THB) */}
          <div className="space-y-1.5">
            <Label htmlFor="amount" className="text-xs font-bold text-muted-foreground">
              {t('finances.totalAmountThb')}
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
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="category" className="text-xs font-bold text-muted-foreground">
              {t('finances.categoryLabel')}
            </Label>
            <div className="relative">
              <select
                id="category"
                className="flex h-11 w-full rounded-xl border border-input bg-background px-3 pl-9 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-foreground font-semibold"
                {...register('category')}
              >
                <option value="food">{t('finances.categoryFoodLabel')}</option>
                <option value="transport">{t('finances.categoryTransportLabel')}</option>
                <option value="activity">{t('finances.categoryActivityLabel')}</option>
                <option value="lodging">{t('finances.categoryLodgingLabel')}</option>
                <option value="other">{t('finances.categoryOtherLabel')}</option>
              </select>
              <Tag className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
            </div>
            {errors.category && (
              <p className="text-destructive text-[11px] mt-0.5">{errors.category.message}</p>
            )}
          </div>

          {/* Paid By Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="paidById" className="text-xs font-bold text-muted-foreground">
              {t('finances.paidBy')}
            </Label>
            <div className="relative">
              <select
                id="paidById"
                className="flex h-11 w-full rounded-xl border border-input bg-muted/50 px-3 pl-9 py-2 text-sm focus-visible:outline-none text-foreground font-semibold pointer-events-none opacity-90"
                tabIndex={-1}
                {...register('paidById')}
              >
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.userId === currentUserId ? t('common.you') : m.name}
                  </option>
                ))}
              </select>
              <div className="absolute left-3.5 top-3.5 h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary">
                {members.find((m) => m.userId === watchPaidById)?.name.charAt(0).toUpperCase()}
              </div>
            </div>
            {extractedSenderName && (
              <p className="text-[10px] text-primary font-bold flex items-center gap-1 mt-1.5 animate-slide-down">
                <Sparkles className="w-3 h-3 text-primary shrink-0" />
                <span>
                  {t('finances.ocrSenderFound', 'แสกนพบผู้โอน:')}{' '}
                  <b className="font-extrabold text-foreground">{extractedSenderName}</b>
                  {extractedBankName && ` (${extractedBankName})`}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Split Method Pill selector */}
        <div className="space-y-2">
          <Label className="text-xs font-bold text-muted-foreground">
            {t('finances.splitMethod')}
          </Label>
          <div className="flex bg-muted rounded-full p-1 border border-border/20 w-full gap-1">
            <button
              type="button"
              onClick={() => setValue('splitMethod', 'equally')}
              className={`flex-1 text-center py-2.5 text-xs font-bold rounded-full transition-all duration-200 ${
                watchSplitMethod === 'equally'
                  ? 'bg-background shadow-sm text-primary font-extrabold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('finances.splitEqually')}
            </button>
            <button
              type="button"
              onClick={() => setValue('splitMethod', 'exact_amount')}
              className={`flex-1 text-center py-2.5 text-xs font-bold rounded-full transition-all duration-200 ${
                watchSplitMethod === 'exact_amount'
                  ? 'bg-background shadow-sm text-primary font-extrabold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('finances.splitByExactAmount')}
            </button>
          </div>
        </div>

        {/* Split Breakdown */}
        <div className="space-y-3">
          <Label className="text-xs font-bold text-muted-foreground">
            {t('finances.splitBreakdown')}
          </Label>

          {watchSplitMethod === 'exact_amount' && isExactMismatch && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3.5 rounded-2xl text-[11px] font-semibold flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-destructive" />
              <span>
                Total splits (฿
                {exactSplitSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}) must sum to
                total amount (฿{watchAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                ). Difference:{' '}
                <b className="font-extrabold">
                  ฿
                  {(watchAmount - exactSplitSum).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </b>
              </span>
            </div>
          )}

          {/* Cards List */}
          <div className="space-y-3 pr-0.5 max-h-[22rem] overflow-y-auto">
            {fields.map((field, index) => {
              const member = members.find((m) => m.userId === field.userId);
              const isChecked = watchSplits[index]?.checked ?? true;
              const splitAmount = watchSplits[index]?.amount ?? 0;

              return (
                <div key={field.id}>
                  <input
                    type="hidden"
                    defaultValue={field.userId}
                    {...register(`splits.${index}.userId`)}
                  />
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={!!watchSplits[index]?.checked}
                    {...register(`splits.${index}.checked`)}
                  />

                  {isChecked && (
                    <div className="group relative border border-border bg-card p-4 rounded-2xl shadow-sm transition-all duration-200 hover:shadow-md animate-slide-down">
                      {/* Close button X (excludes traveler) - hidden for current user and payer */}
                      {field.userId !== currentUserId && field.userId !== watchPaidById && (
                        <button
                          type="button"
                          onClick={() => handleExcludeTraveler(index)}
                          className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 duration-150"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <div className="flex items-center justify-between gap-3">
                        {/* User profile & Name */}
                        <div className="flex items-center gap-3">
                          {member?.avatarUrl ? (
                            <img
                              src={member.avatarUrl}
                              alt={member.name}
                              className="w-9 h-9 rounded-full object-cover shadow-sm ring-1 ring-border"
                            />
                          ) : (
                            <div
                              className={`w-9 h-9 rounded-full font-bold flex items-center justify-center text-xs ${getAvatarBgColor(member?.name || '')}`}
                            >
                              {member?.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <span className="text-foreground text-sm font-semibold leading-none block">
                              {member?.userId === currentUserId
                                ? `${member?.name} (${t('common.you')})`
                                : member?.name}
                            </span>
                          </div>
                        </div>

                        {/* Amount display for Equal share */}
                        {watchSplitMethod === 'equally' && (
                          <span className="text-primary text-base font-extrabold min-w-[5rem] text-right">
                            ฿{splitAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>

                      {/* Inputs display for Exact split */}
                      {watchSplitMethod === 'exact_amount' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 border-t border-border/40 pt-3 animate-slide-down">
                          <div className="space-y-1">
                            <Label
                              htmlFor={`splits.${index}.itemPaid`}
                              className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center h-4"
                            >
                              {t('finances.itemPaidLabel')}
                            </Label>
                            <Input
                              id={`splits.${index}.itemPaid`}
                              type="text"
                              placeholder={t('finances.itemPaidPlaceholder', 'Menu/item (e.g. Pad Thai)')}
                              className="h-9 text-xs border-input rounded-xl focus-visible:ring-primary bg-muted/30"
                              {...register(`splits.${index}.itemPaid`)}
                            />
                          </div>

                          <div className="space-y-1">
                            <Label
                              htmlFor={`splits.${index}.amount`}
                              className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between h-4"
                            >
                              <span>{t('finances.amountThbLabel')}</span>
                              {field.userId === watchPaidById && (
                                <span className="text-[9px] text-primary font-extrabold normal-case leading-none">
                                  ({t('finances.autoPayerRemainder')})
                                </span>
                              )}
                            </Label>
                            <div className="relative">
                              <Input
                                id={`splits.${index}.amount`}
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                readOnly={field.userId === watchPaidById}
                                value={
                                  field.userId === watchPaidById ? calculatedPayerAmount : undefined
                                }
                                className={`h-9 pl-6 pr-2 text-xs font-bold border-input rounded-xl focus-visible:ring-primary text-right ${
                                  field.userId === watchPaidById
                                    ? 'bg-muted text-muted-foreground cursor-not-allowed select-none'
                                    : 'text-foreground'
                                }`}
                                {...(field.userId === watchPaidById
                                  ? {}
                                  : register(`splits.${index}.amount`, { valueAsNumber: true }))}
                              />
                              <span className="absolute left-2.5 top-2.5 text-[10px] font-bold text-muted-foreground">
                                ฿
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* "+ Add Person" Button container */}
            <div ref={addPersonRef} className="relative mt-2">
              {excludedTravelers.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setIsAddPersonOpen(!isAddPersonOpen)}
                  className="w-full flex items-center justify-center gap-2 py-3.5 border border-dashed border-border hover:border-primary hover:bg-primary/10 rounded-2xl text-xs font-bold text-primary hover:text-primary/80 transition-all duration-200 cursor-pointer shadow-sm bg-muted/10"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{t('finances.addPerson')}</span>
                </button>
              ) : (
                <div className="text-center py-2.5 text-xs text-muted-foreground font-semibold border border-dashed border-border rounded-2xl">
                  {t('finances.allTripMembersIncluded')}
                </div>
              )}

              {/* Floating menu overlay of excluded members */}
              {isAddPersonOpen && excludedTravelers.length > 0 && (
                <div className="absolute z-30 top-full left-0 right-0 mt-2 max-h-48 overflow-y-auto border border-border bg-popover rounded-2xl shadow-xl p-2 flex flex-col gap-1.5 animate-slide-down">
                  <div className="px-2.5 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/40 flex justify-between items-center">
                    <span>{t('finances.addTraveler')}</span>
                  </div>
                  {excludedTravelers.length > 1 && (
                    <button
                      type="button"
                      onClick={handleAddAll}
                      className="flex items-center gap-2.5 p-2 rounded-xl text-left bg-primary/5 hover:bg-primary/10 text-primary font-bold transition-all border border-primary/20 w-full"
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs">{t('finances.everyone')}</span>
                    </button>
                  )}
                  {excludedTravelers.map((field) => {
                    const member = members.find((m) => m.userId === field.userId);
                    return (
                      <button
                        key={field.id}
                        type="button"
                        onClick={() => handleIncludeTraveler(field.originalIndex)}
                        className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-muted transition-colors"
                      >
                        {member?.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member.name}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className={`w-6 h-6 rounded-full font-bold flex items-center justify-center text-[10px] ${getAvatarBgColor(member?.name || '')}`}
                          >
                            {member?.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-xs text-foreground font-semibold">
                          {member?.userId === currentUserId
                            ? `${member?.name} (${t('common.you')})`
                            : member?.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Buttons - inside the form so submit works */}
        <div className="flex items-center justify-end gap-3 border-t border-border px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-muted/30">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="text-xs h-10 px-5 rounded-full border border-input hover:bg-muted font-bold transition-all text-muted-foreground"
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || (watchSplitMethod === 'exact_amount' && isExactMismatch)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-10 px-6 rounded-full font-bold shadow-sm flex items-center gap-2 transition-all"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{t('common.saving')}</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>{t('finances.saveExpense')}</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
