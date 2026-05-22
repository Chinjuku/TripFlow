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
import { Button } from '@trip-flow/ui/components/button';
import { Input } from '@trip-flow/ui/components/input';
import { Label } from '@trip-flow/ui/components/label';

// Zod schema for validation
const createExpenseSchema = z.object({
  description: z.string().min(1, 'Merchant/Description is required').max(120, 'Merchant name is too long'),
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
    })
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
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);
  const addPersonRef = useRef<HTMLDivElement>(null);

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
      expenseDate: new Date().toISOString().substring(0, 16), // datetime-local format: YYYY-MM-DDTHH:mm
      splits: members.map((m) => ({
        userId: m.userId,
        amount: 0,
        itemPaid: '',
        checked: true,
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

  const checkedCount = watchSplits.filter((s) => s.checked).length;

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

  // Validation: Sum of exact split amounts must match total expense amount
  const exactSplitSum = watchSplits.reduce((sum, s) => sum + (s.amount || 0), 0);
  const isExactMismatch =
    watchSplitMethod === 'exact_amount' && Math.abs(exactSplitSum - watchAmount) > 0.05;

  // Simulate receipt upload & OCR parsing
  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
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

    // Simulate OCR scanning
    setTimeout(() => {
      setIsScanning(false);
      setIsAutofilled(true);
      
      // Auto-fill values to match the screenshots perfectly
      setValue('description', 'Nara Thai Cuisine');
      setValue('amount', 2500);
      setValue('expenseDate', '2023-10-24T12:00');
      setValue('category', 'food');
    }, 1200);
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

  const handleAddAllExceptMe = () => {
    fields.forEach((field, index) => {
      if (field.userId === currentUserId) {
        setValue(`splits.${index}.checked`, false);
        setValue(`splits.${index}.amount`, 0);
        setValue(`splits.${index}.itemPaid`, '');
      } else {
        setValue(`splits.${index}.checked`, true);
      }
    });
    setIsAddPersonOpen(false);
  };

  const handleFormSubmit = (data: ExpenseFormValues) => {
    // Filter down to involved splits only
    const activeSplits = data.splits
      .filter((s) => (data.splitMethod === 'equally' ? s.checked : s.amount > 0))
      .map((s) => ({
        userId: s.userId,
        amount: s.amount,
        itemPaid: data.splitMethod === 'exact_amount' ? s.itemPaid || null : null,
      }));

    if (activeSplits.length === 0) {
      alert('At least one traveler must be in the split');
      return;
    }

    if (data.splitMethod === 'exact_amount' && isExactMismatch) {
      alert(`Total splits must sum to ฿${data.amount.toLocaleString()}`);
      return;
    }

    onSubmit({
      description: data.description,
      amount: data.amount,
      paidById: data.paidById,
      category: data.category,
      splitMethod: data.splitMethod,
      expenseDate: new Date(data.expenseDate).toISOString(),
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
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <ReceiptText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-headline text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">
              Record & Split
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Add a new expense and choose how to distribute the cost
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* OCR Dropzone */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleReceiptUpload}
          className="relative group cursor-pointer border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 dark:hover:border-emerald-500/40 rounded-2xl p-6 bg-slate-50/50 dark:bg-slate-900/30 text-center transition-all duration-200"
        >
          <input
            id="receipt-upload"
            type="file"
            accept="image/*,application/pdf"
            onChange={handleReceiptUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform duration-200">
              {isScanning ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <CloudUpload className="w-6 h-6" />
              )}
            </div>
            {isScanning ? (
              <div className="space-y-1.5 z-20">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Scanning receipt for details...
                </p>
                <div className="w-48 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mx-auto overflow-hidden">
                  <div className="h-full bg-emerald-500 animate-infinite-loading rounded-full" />
                </div>
              </div>
            ) : uploadedFile ? (
              <div className="z-20">
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 justify-center">
                  <Check className="w-4 h-4" /> Receipt Loaded
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {uploadedFile.name} ({uploadedFile.size})
                </p>
              </div>
            ) : (
              <div className="z-20">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Upload Receipt for OCR
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  PNG, JPG or PDF up to 10MB
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Form Fields Card Block */}
        <div className="relative border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 bg-slate-50/50 dark:bg-slate-900/10 space-y-4">
          {/* Sparkle Autofilled Badge */}
          {isAutofilled && (
            <div className="absolute -top-3 left-4 flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-full text-[10px] font-bold dark:bg-emerald-950/50 dark:border-emerald-900/30 dark:text-emerald-400 shadow-sm animate-pulse-once">
              <Sparkles className="w-3 h-3" />
              <span>Auto-filled</span>
            </div>
          )}

          {/* Merchant & Date */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Merchant
              </Label>
              <div className="relative">
                <Input
                  id="description"
                  placeholder="e.g. Nara Thai Cuisine"
                  className={`pl-9 h-11 border-slate-200/80 dark:border-slate-800 dark:bg-slate-950 rounded-xl focus-visible:ring-emerald-500 text-sm ${
                    errors.description ? 'border-red-500 dark:border-red-950' : ''
                  }`}
                  {...register('description')}
                />
                <Store className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
              </div>
              {errors.description && (
                <p className="text-red-500 dark:text-red-400 text-[11px] mt-0.5">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expenseDate" className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Date
              </Label>
              <div className="relative">
                <Input
                  id="expenseDate"
                  type="datetime-local"
                  className="pl-9 h-11 border-slate-200/80 dark:border-slate-800 dark:bg-slate-950 rounded-xl focus-visible:ring-emerald-500 text-sm"
                  {...register('expenseDate')}
                />
                <Calendar className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
              </div>
              {errors.expenseDate && (
                <p className="text-red-500 dark:text-red-400 text-[11px] mt-0.5">{errors.expenseDate.message}</p>
              )}
            </div>
          </div>

          {/* Total Amount (THB) */}
          <div className="space-y-1.5">
            <Label htmlFor="amount" className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Total Amount (THB)
            </Label>
            <div className="relative flex items-center">
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                className={`pl-14 h-14 border-slate-200/80 dark:border-slate-800 dark:bg-slate-950 rounded-xl focus-visible:ring-emerald-500 text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 ${
                  errors.amount ? 'border-red-500 dark:border-red-950' : ''
                }`}
                {...register('amount', { valueAsNumber: true })}
              />
              <div className="absolute left-4 flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                <Banknote className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                <span className="text-lg font-bold text-slate-800 dark:text-slate-200">฿</span>
              </div>
            </div>
            {errors.amount && (
              <p className="text-red-500 dark:text-red-400 text-[11px] mt-0.5">{errors.amount.message}</p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="category" className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Category
            </Label>
            <div className="relative">
              <select
                id="category"
                className="flex h-11 w-full rounded-xl border border-slate-200/80 dark:border-slate-800 dark:bg-slate-950 px-3 pl-9 py-2 text-sm ring-offset-background placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-slate-700 dark:text-slate-200 font-semibold"
                {...register('category')}
              >
                <option value="food">🍴 Food & Drink</option>
                <option value="transport">🚗 Transportation</option>
                <option value="activity">🧗 Activities & Sightseeing</option>
                <option value="lodging">🏨 Lodging & Stays</option>
                <option value="other">💵 Other Costs</option>
              </select>
              <Tag className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
            </div>
            {errors.category && (
              <p className="text-red-500 dark:text-red-400 text-[11px] mt-0.5">{errors.category.message}</p>
            )}
          </div>

          {/* Paid By Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="paidById" className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Paid By
            </Label>
            <select
              id="paidById"
              className="flex h-11 w-full rounded-xl border border-slate-200/80 dark:border-slate-800 dark:bg-slate-950 px-3 py-2 text-sm focus-visible:outline-none text-slate-700 dark:text-slate-200 font-semibold"
              {...register('paidById')}
            >
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.userId === currentUserId ? 'You' : m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Split Method Pill selector */}
        <div className="space-y-2">
          <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Split Method
          </Label>
          <div className="flex bg-slate-100/80 dark:bg-slate-900/60 rounded-full p-1 border border-slate-200/20 dark:border-slate-800/20 w-full gap-1">
            <button
              type="button"
              onClick={() => setValue('splitMethod', 'equally')}
              className={`flex-1 text-center py-2.5 text-xs font-bold rounded-full transition-all duration-200 ${
                watchSplitMethod === 'equally'
                  ? 'bg-white shadow-sm text-emerald-700 dark:bg-slate-950 dark:text-emerald-400 font-extrabold'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Equally
            </button>
            <button
              type="button"
              onClick={() => setValue('splitMethod', 'exact_amount')}
              className={`flex-1 text-center py-2.5 text-xs font-bold rounded-full transition-all duration-200 ${
                watchSplitMethod === 'exact_amount'
                  ? 'bg-white shadow-sm text-emerald-700 dark:bg-slate-950 dark:text-emerald-400 font-extrabold'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              By Exact Amount
            </button>
          </div>
        </div>

        {/* Split Breakdown */}
        <div className="space-y-3">
          <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Split Breakdown
          </Label>

          {watchSplitMethod === 'exact_amount' && isExactMismatch && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 p-3.5 rounded-2xl text-[11px] font-semibold flex items-start gap-2.5 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>
                Total splits (฿{exactSplitSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}) must sum to total amount (฿{watchAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}). Difference:{' '}
                <b className="font-extrabold">฿{(watchAmount - exactSplitSum).toLocaleString(undefined, { minimumFractionDigits: 2 })}</b>
              </span>
            </div>
          )}

          {/* Cards List */}
          <div className="space-y-3 pr-0.5 max-h-[22rem] overflow-y-auto">
            {fields.map((field, index) => {
              const member = members.find((m) => m.userId === field.userId);
              const isChecked = watchSplits[index]?.checked ?? true;
              const splitAmount = watchSplits[index]?.amount ?? 0;

              // Hide excluded travelers visually (we filter from view, they are shown in Add Person popup)
              if (!isChecked) return null;

              return (
                <div
                  key={field.id}
                  className="group relative border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 rounded-2xl shadow-sm transition-all duration-200 hover:shadow-md"
                >
                  {/* Close button X (excludes traveler) — hidden for current user */}
                  {field.userId !== currentUserId && (
                    <button
                      type="button"
                      onClick={() => handleExcludeTraveler(index)}
                      className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-slate-300 hover:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 duration-150"
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
                          className="w-9 h-9 rounded-full object-cover shadow-sm ring-1 ring-slate-100 dark:ring-slate-800"
                        />
                      ) : (
                        <div className={`w-9 h-9 rounded-full font-bold flex items-center justify-center text-xs ${getAvatarBgColor(member?.name || '')}`}>
                          {member?.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <span className="text-slate-800 dark:text-slate-100 text-sm font-semibold leading-none block">
                          {member?.userId === currentUserId ? `${member?.name} (Me)` : member?.name}
                        </span>
                      </div>
                    </div>

                    {/* Amount display for Equal share */}
                    {watchSplitMethod === 'equally' && (
                      <span className="text-emerald-700 dark:text-emerald-400 text-base font-extrabold min-w-[5rem] text-right">
                        ฿{splitAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>

                  {/* Inputs display for Exact split */}
                  {watchSplitMethod === 'exact_amount' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 border-t border-slate-50 dark:border-slate-900 pt-3 animate-slide-down">
                      <div className="space-y-1">
                        <Label htmlFor={`splits.${index}.itemPaid`} className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          Item Paid
                        </Label>
                        <Input
                          id={`splits.${index}.itemPaid`}
                          type="text"
                          placeholder="Menu/item (e.g. Pad Thai)"
                          className="h-9 text-xs border-slate-200/80 dark:border-slate-800 rounded-xl focus-visible:ring-emerald-500 bg-slate-50/30 dark:bg-slate-900/30"
                          {...register(`splits.${index}.itemPaid`)}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor={`splits.${index}.amount`} className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          Amount (THB)
                        </Label>
                        <div className="relative">
                          <Input
                            id={`splits.${index}.amount`}
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="h-9 pl-6 pr-2 text-xs font-bold border-slate-200/80 dark:border-slate-800 rounded-xl focus-visible:ring-emerald-500 text-right text-slate-700 dark:text-slate-200"
                            {...register(`splits.${index}.amount`, { valueAsNumber: true })}
                          />
                          <span className="absolute left-2.5 top-2.5 text-[10px] font-bold text-slate-400">
                            ฿
                          </span>
                        </div>
                      </div>
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
                  className="w-full flex items-center justify-center gap-2 py-3.5 border border-dashed border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/10 rounded-2xl text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 transition-all duration-200 cursor-pointer shadow-sm bg-slate-50/10"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Add Person</span>
                </button>
              ) : (
                <div className="text-center py-2.5 text-xs text-slate-400 dark:text-slate-500 font-semibold border border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                  All trip members included in split
                </div>
              )}

              {/* Floating menu overlay of excluded members */}
              {isAddPersonOpen && excludedTravelers.length > 0 && (
                <div className="absolute z-30 top-full left-0 right-0 mt-2 max-h-48 overflow-y-auto border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-2 flex flex-col gap-1.5 animate-slide-down">
                  <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
                    <span>Add traveler</span>
                  </div>
                  {excludedTravelers.length > 1 && (
                    <button
                      type="button"
                      onClick={handleAddAllExceptMe}
                      className="flex items-center gap-2.5 p-2 rounded-xl text-left bg-emerald-50/50 hover:bg-emerald-50 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold transition-all border border-emerald-100/30 w-full"
                    >
                      <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs">Everyone except me</span>
                    </button>
                  )}
                  {excludedTravelers.map((field) => {
                    const member = members.find((m) => m.userId === field.userId);
                    return (
                      <button
                        key={field.id}
                        type="button"
                        onClick={() => handleIncludeTraveler(field.originalIndex)}
                        className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        {member?.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member.name}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className={`w-6 h-6 rounded-full font-bold flex items-center justify-center text-[10px] ${getAvatarBgColor(member?.name || '')}`}>
                            {member?.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-xs text-slate-700 dark:text-slate-200 font-semibold">
                          {member?.userId === currentUserId ? `${member?.name} (Me)` : member?.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Buttons — inside the form so submit works */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-slate-50/30 dark:bg-slate-900/10">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="text-xs h-10 px-5 rounded-full border border-slate-200 hover:bg-slate-50 font-bold transition-all text-slate-600 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || (watchSplitMethod === 'exact_amount' && isExactMismatch)}
            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-10 px-6 rounded-full font-bold shadow-sm flex items-center gap-2 transition-all"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Save Expense</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
