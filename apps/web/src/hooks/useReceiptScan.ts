import { useState } from 'react';
import { extractReceipt } from '@/api/finances';
import type { UseFormSetValue } from 'react-hook-form';
import type { ExpenseFormValues } from '@/components/feat/finances/expenses/expense-form-schema';
import type { ExpenseFormMember } from '@/components/feat/finances/expenses/expense-form-schema';

interface UseReceiptScanArgs {
  members: ExpenseFormMember[];
  setValue: UseFormSetValue<ExpenseFormValues>;
}

/**
 * Handles receipt image upload → OCR extraction → autofill of the expense form.
 * On success it fills merchant/amount/date, surfaces the detected sender/bank,
 * and auto-selects the matching group member as payer.
 */
export function useReceiptScan({ members, setValue }: UseReceiptScanArgs) {
  const [isScanning, setIsScanning] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string } | null>(null);
  const [isAutofilled, setIsAutofilled] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [extractedSenderName, setExtractedSenderName] = useState<string | null>(null);
  const [extractedBankName, setExtractedBankName] = useState<string | null>(null);

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

  return {
    isScanning,
    uploadedFile,
    isAutofilled,
    scanError,
    extractedSenderName,
    extractedBankName,
    handleReceiptUpload,
  };
}
