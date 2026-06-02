import React, { useState, useEffect } from 'react';
import { Modal } from '@trip-flow/ui/components/modal';
import { Button } from '@trip-flow/ui/components/button';
import {
  Check,
  Copy,
  QrCode,
  CreditCard,
  CheckCircle2,
  CloudUpload,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type { DebtRelation, UserPaymentDetail } from './types';
import { useTranslation, Trans } from 'react-i18next';
import { findBank } from '@/utils/thai-banks';
import { verifySlip } from './api';

interface SettleUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payee: DebtRelation | null;
  paymentDetails: UserPaymentDetail | undefined;
  onSubmit: (payeeId: string, amount: number) => Promise<any>;
  isSubmitting: boolean;
  onVerified?: (silent?: boolean) => void;
}

export function SettleUpModal({
  open,
  onOpenChange,
  payee,
  paymentDetails,
  onSubmit,
  isSubmitting,
  onVerified,
}: SettleUpModalProps) {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // ตัดโหมด qr_image ออกไป เหลือแค่ Bank Account และ PromptPay
  const [method, setMethod] = useState<'promptpay_id' | 'bank' | null>(null);
  const { t, i18n } = useTranslation();

  // E-Slip Verification states
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: string;
    file: File;
  } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [pendingSettlementId, setPendingSettlementId] = useState<string | null>(null);

  const activeMethods: ('promptpay_id' | 'bank')[] = [];

  // ดึงข้อมูล Bank Account มาแสดง (ถ้ามีข้อมูล)
  if (paymentDetails?.bank_name && paymentDetails?.bank_account_number) {
    activeMethods.push('bank');
  }

  // ดึงข้อมูล PromptPay ID มาแสดง (ถ้ามีข้อมูล)
  if (paymentDetails?.promptpay_id) {
    activeMethods.push('promptpay_id');
  }

  const activeMethodsKey = activeMethods.join(',');
  useEffect(() => {
    if (activeMethods.length > 0) {
      if (!method || !activeMethods.includes(method)) {
        setMethod(activeMethods[0] ?? null);
      }
    } else {
      setMethod(null);
    }
  }, [activeMethodsKey, method]);

  if (!payee) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const promptPayId = paymentDetails?.promptpay_id;
  const dynamicQrUrl = promptPayId
    ? `https://promptpay.io/${promptPayId}/${payee.amount.toFixed(2)}.png`
    : null;

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
    setUploadedFile({ name: file.name, size: `${sizeInMB} MB`, file });
    setScanError(null);
    setIsScanning(true);

    try {
      // 1. Create the pending settlement first if not already created
      let settlementId = pendingSettlementId;
      if (!settlementId) {
        const createdSettlement = await onSubmit(payee.userId, payee.amount);
        if (!createdSettlement) {
          setIsScanning(false);
          return;
        }
        setPendingSettlementId(createdSettlement.id);
        settlementId = createdSettlement.id;
      }

      // 2. Call API to verify slip
      const result = await verifySlip(settlementId as string, file);

      if (result.isMatch) {
        onVerified?.();
        onOpenChange(false);
      } else {
        setScanError(result.reason || 'ไม่สามารถตรวจสอบสลิปนี้ได้ หรือสลิปนี้อาจถูกใช้งานไปแล้ว');
        setUploadedFile(null); // allow re-upload if failed
        setPendingSettlementId(null);
        onVerified?.(true); // refresh silently to remove pending status without blinking
      }
    } catch (err) {
      console.error('Verify slip error:', err);
      setScanError(
        err instanceof Error
          ? err.message
          : 'ไม่สามารถตรวจสอบสลิปนี้ได้ หรือสลิปนี้อาจถูกใช้งานไปแล้ว',
      );
      setUploadedFile(null); // allow re-upload
      setPendingSettlementId(null);
      onVerified?.(true); // refresh silently to remove pending status without blinking
    } finally {
      setIsScanning(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleConfirm = async () => {
    // Note: Manual confirm button was removed per requirements,
    // but we keep this function in case it's needed in the future or invoked programmatically.
    await onSubmit(payee.userId, payee.amount);
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t('finances.settleUpDebt', 'Settle Up Debt')}
      description={t('finances.payOffBalance', {
        name: payee.name,
        defaultValue: `Pay off your balance to ${payee.name}`,
      })}
      className="sm:max-w-md font-sans"
    >
      <div className="space-y-5 pt-2">
        {/* Payee Info Panel */}
        <div className="bg-muted/40 border border-border flex items-center justify-between p-4 rounded-xl">
          <div className="flex items-center gap-3">
            {payee.avatarUrl ? (
              <img
                src={payee.avatarUrl}
                alt={payee.name}
                className="w-10 h-10 rounded-full object-cover shadow-sm ring-2 ring-emerald-100 dark:ring-emerald-900"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-bold flex items-center justify-center text-sm">
                {payee.name.charAt(0)}
              </div>
            )}
            <div>
              <span className="text-muted-foreground text-xs block">
                {t('finances.sendingRepaymentTo', 'Sending to')}
              </span>
              <span className="text-foreground text-sm font-bold">{payee.name}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-muted-foreground text-xs block">
              {t('finances.amountDue', 'Amount Due')}
            </span>
            <span className="text-destructive font-headline text-lg font-extrabold">
              ฿{payee.amount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Method Toggle */}
        {activeMethods.length > 1 && (
          <div className="flex bg-muted/50 rounded-lg p-1 border border-border gap-1">
            {activeMethods.includes('bank') && (
              <button
                type="button"
                onClick={() => setMethod('bank')}
                className={`flex-1 text-center py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  method === 'bank'
                    ? 'bg-background shadow text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                {t('finances.bankTransfer', 'Bank Transfer')}
              </button>
            )}
            {activeMethods.includes('promptpay_id') && (
              <button
                type="button"
                onClick={() => setMethod('promptpay_id')}
                className={`flex-1 text-center py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  method === 'promptpay_id'
                    ? 'bg-background shadow text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                {t('finances.promptPayId', 'PromptPay')}
              </button>
            )}
          </div>
        )}

        {/* 1. Bank Account Details */}
        {method === 'bank' && (
          <div className="space-y-3 bg-muted/20 border border-border rounded-xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between border-b border-border pb-3 last:border-0">
              <span className="text-muted-foreground text-xs font-semibold">
                {t('finances.bankName', 'Bank')}
              </span>
              <span className="text-foreground text-xs font-bold uppercase">
                {(() => {
                  const bank = findBank(paymentDetails?.bank_name || '');
                  return bank
                    ? i18n.language.startsWith('th')
                      ? bank.thaiName
                      : bank.niceName
                    : paymentDetails?.bank_name;
                })()}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-border pb-3 last:border-0">
              <span className="text-muted-foreground text-xs font-semibold">
                {t('finances.accountName', 'Account Name')}
              </span>
              <span
                className="text-foreground text-xs font-bold uppercase truncate max-w-[200px]"
                title={paymentDetails?.bank_account_name ?? undefined}
              >
                {paymentDetails?.bank_account_name || '-'}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-border pb-3 last:border-0">
              <span className="text-muted-foreground text-xs font-semibold">
                {t('finances.accountNumber', 'Account Number')}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-foreground text-xs font-bold font-mono tracking-wide">
                  {paymentDetails?.bank_account_number}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(paymentDetails?.bank_account_number || '', 'bank')}
                  className="text-muted-foreground hover:text-primary transition-colors bg-muted/50 p-1.5 rounded-md"
                >
                  {copiedText === 'bank' ? (
                    <Check className="w-3.5 h-3.5 text-primary animate-in fade-in duration-300" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between py-1 last:border-0">
              <span className="text-muted-foreground text-xs font-semibold">
                {t('finances.amountDue', 'Transfer Amount')}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-destructive text-xs font-bold font-mono tracking-wide">
                  ฿{payee.amount.toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(payee.amount.toFixed(2), 'amount')}
                  className="text-muted-foreground hover:text-primary transition-colors bg-muted/50 p-1.5 rounded-md"
                >
                  {copiedText === 'amount' ? (
                    <Check className="w-3.5 h-3.5 text-primary animate-in fade-in duration-300" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. Dynamic PromptPay QR / ID display */}
        {method === 'promptpay_id' && (
          <div className="flex flex-col items-center justify-center gap-4 py-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {dynamicQrUrl && (
              <div className="bg-white border border-border p-3 rounded-2xl shadow-sm relative overflow-hidden">
                <img
                  src={dynamicQrUrl}
                  alt="Dynamic PromptPay QR Code"
                  className="w-48 h-48 object-contain"
                />
                <div className="absolute inset-x-0 bottom-0 bg-[#113566] text-white text-[9px] font-bold text-center py-1 uppercase tracking-widest flex items-center justify-center gap-1">
                  <span className="text-white/80">PromptPay</span>
                </div>
              </div>
            )}

            {promptPayId && (
              <div className="flex items-center gap-2 bg-[#113566]/5 border border-[#113566]/20 rounded-xl px-4 py-2 dark:bg-[#113566]/20 dark:border-[#113566]/40">
                <span className="text-[10px] font-bold text-[#113566] dark:text-blue-300 uppercase">
                  {t('finances.promptPayId', 'PromptPay ID')}:
                </span>
                <span className="text-foreground text-sm font-bold font-mono tracking-wide">
                  {promptPayId}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(promptPayId, 'promptpay')}
                  className="text-muted-foreground hover:text-foreground transition-colors ml-2 bg-background p-1.5 rounded-md border border-border shadow-sm"
                >
                  {copiedText === 'promptpay' ? (
                    <Check className="w-3.5 h-3.5 text-primary animate-in fade-in duration-300" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            )}
            <p className="text-muted-foreground text-[10px] text-center max-w-xs leading-normal">
              <Trans
                i18nKey="finances.scanQrAnyApp"
                defaultValue="Scan this QR code with any banking app to pay exactly <b>฿{{amount}}</b>."
                values={{ amount: payee.amount.toFixed(2) }}
                components={{ 1: <b className="text-foreground" /> }}
              />
            </p>
          </div>
        )}

        {/* No payment details available */}
        {activeMethods.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-xs space-y-1.5 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-300 animate-in fade-in duration-300">
            <h4 className="font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
              {t('finances.noPaymentDetails', 'No Payment Info')}
            </h4>
            <p className="leading-relaxed">
              {t('finances.noPaymentDetailsDesc', {
                name: payee.name,
                defaultValue: `${payee.name} hasn't provided any payment details yet.`,
              })}
            </p>
          </div>
        )}

        {/* OCR Dropzone (Only show if payment methods exist) */}
        {activeMethods.length > 0 && (
          <div className="border-t border-border pt-4">
            {scanError && (
              <div className="mb-3 border-rose-100 bg-rose-50 text-rose-800 p-3 rounded-xl border text-xs flex items-center gap-2 dark:bg-rose-950/20 dark:border-rose-950/30 dark:text-rose-400">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{scanError}</span>
              </div>
            )}
            <div
              onDragOver={handleDragOver}
              onDrop={handleReceiptUpload}
              className={`relative group cursor-pointer border-2 border-dashed rounded-2xl p-4 text-center transition-all duration-200 ${scanError ? 'border-destructive bg-destructive/5' : 'border-border hover:border-primary/50 bg-muted/50'}`}
            >
              <input
                id="slip-upload"
                type="file"
                accept="image/*,application/pdf"
                onChange={handleReceiptUpload}
                disabled={isScanning}
                className={`absolute inset-0 w-full h-full opacity-0 ${isScanning ? 'cursor-not-allowed' : 'cursor-pointer'} z-10`}
              />
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform duration-200">
                  {isScanning ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <CloudUpload className="w-5 h-5" />
                  )}
                </div>
                {isScanning ? (
                  <div className="space-y-1.5 z-20">
                    <p className="text-xs font-semibold text-primary">
                      กำลังตรวจสอบสลิป กรุณารอสักครู่...
                    </p>
                  </div>
                ) : uploadedFile && !scanError ? (
                  <div className="z-20">
                    <p className="text-xs font-semibold text-primary flex items-center gap-1 justify-center">
                      <Check className="w-3.5 h-3.5" /> แนบสลิปแล้ว
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{uploadedFile.name}</p>
                  </div>
                ) : (
                  <div className="z-20">
                    <p className="text-xs font-semibold text-muted-foreground">
                      อัปโหลดสลิปโอนเงิน
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      ระบบจะช่วยตรวจสอบยอดเงินให้โดยอัตโนมัติ
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Confirm Settlement Buttons */}
        <div className="pt-2 flex flex-col gap-2">
          {/* Removed manual confirmation button per request */}
          <Button
            type="button"
            variant="outline"
            disabled={isScanning}
            onClick={() => onOpenChange(false)}
            className="w-full text-xs h-10 rounded-xl border border-border hover:bg-muted font-bold transition-colors"
          >
            {t('common.cancel', 'Cancel')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
