import * as z from 'zod';

/** Validation schema for the create-expense form. */
export const createExpenseSchema = z.object({
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

export type ExpenseFormValues = z.infer<typeof createExpenseSchema>;

export interface ExpenseFormMember {
  userId: string;
  name: string;
  avatarUrl: string | null;
}
