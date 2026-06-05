import React, { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  Calendar,
  Tag,
  ReceiptText,
  Loader2,
  Sparkles,
  Store,
  Banknote,
  Check,
  X,
  UserPlus,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar } from '@/components/ui/avatar';
import { useTranslation } from 'react-i18next';
import { useReceiptScan } from '@/hooks/useReceiptScan';
import { useSplitCalculator } from '@/hooks/useSplitCalculator';
import {
  createExpenseSchema,
  type ExpenseFormValues,
  type ExpenseFormMember,
} from './expense-form-schema';
import { ReceiptDropzone } from './ReceiptDropzone';
import { SplitMemberCard } from './SplitMemberCard';
import type { CreateExpensePayload } from '@/types/finances';

interface CreateExpenseFormProps {
  members: ExpenseFormMember[];
  currentUserId: string;
  onSubmit: (values: Omit<CreateExpensePayload, 'tripId'>) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function CreateExpenseForm({
  members,
  currentUserId,
  onSubmit,
  onCancel,
  isSubmitting,
}: CreateExpenseFormProps) {
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

  const watchAmount = watch('amount') || 0;
  const watchSplitMethod = watch('splitMethod');
  const watchSplits = watch('splits') || [];
  const watchPaidById = watch('paidById');

  // OCR receipt scanning + autofill
  const {
    isScanning,
    uploadedFile,
    isAutofilled,
    scanError,
    extractedSenderName,
    extractedBankName,
    handleReceiptUpload,
  } = useReceiptScan({ members, setValue });

  // Dynamic split math (equal/exact) + validation figures
  const { exactPayerIndex, calculatedPayerAmount, exactSplitSum, isExactMismatch } =
    useSplitCalculator({ watch, setValue });

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
        }),
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
        <ReceiptDropzone
          isScanning={isScanning}
          uploadedFile={uploadedFile}
          onUpload={handleReceiptUpload}
        />

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
            <div className="absolute -top-3 left-4 flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm">
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
                {members
                  .find((m) => m.userId === watchPaidById)
                  ?.name.charAt(0)
                  .toUpperCase()}
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
                    <SplitMemberCard
                      index={index}
                      userId={field.userId}
                      member={member}
                      splitAmount={splitAmount}
                      splitMethod={watchSplitMethod}
                      currentUserId={currentUserId}
                      paidById={watchPaidById}
                      calculatedPayerAmount={calculatedPayerAmount}
                      register={register}
                      onExclude={handleExcludeTraveler}
                    />
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
                        <Avatar
                          name={member?.name || ''}
                          src={member?.avatarUrl}
                          size="w-6 h-6"
                          className="text-[10px]"
                        />
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
