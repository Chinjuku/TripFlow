import React, { useState, useEffect } from 'react';
import { Modal } from '@trip-flow/ui/components/modal';
import { Button } from '@trip-flow/ui/components/button';
import { Check, Copy, QrCode, CreditCard, CheckCircle2 } from 'lucide-react';
import type { DebtRelation, UserPaymentDetail } from '../types';
import { useTranslation, Trans } from 'react-i18next';

interface SettleUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payee: DebtRelation | null;
  paymentDetails: UserPaymentDetail | undefined;
  onSubmit: (payeeId: string, amount: number) => Promise<void>;
  isSubmitting: boolean;
}

export function SettleUpModal({
  open,
  onOpenChange,
  payee,
  paymentDetails,
  onSubmit,
  isSubmitting,
}: SettleUpModalProps) {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [method, setMethod] = useState<'qr_image' | 'promptpay_id' | 'bank' | null>(null);
  const { t } = useTranslation();

  // Compute active methods based on mutually exclusive visibility flags
  const activeMethods: ('qr_image' | 'promptpay_id' | 'bank')[] = [];
  
  // Enforce mutual exclusivity safely with defaults
  const showPromptpay = paymentDetails ? (paymentDetails.is_show_promptpay ?? true) : true;
  const showMobileBanking = paymentDetails ? (paymentDetails.is_show_mobile_banking ?? !showPromptpay) : false;

  if (showPromptpay) {
    if (paymentDetails?.qr_code_url) activeMethods.push('qr_image');
    if (paymentDetails?.promptpay_id) activeMethods.push('promptpay_id');
  }
  
  if (showMobileBanking) {
    if (
      paymentDetails?.bank_name &&
      paymentDetails?.bank_account_number &&
      paymentDetails?.bank_account_name
    ) {
      activeMethods.push('bank');
    }
  }

  // Set the default active method based on availability and priority
  const activeMethodsKey = activeMethods.join(',');
  useEffect(() => {
    if (activeMethods.length > 0) {
      if (!method || !activeMethods.includes(method)) {
        setMethod(activeMethods[0] ?? null);
      }
    } else {
      setMethod(null);
    }
  }, [activeMethodsKey]);

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

  const handleConfirm = async () => {
    await onSubmit(payee.userId, payee.amount);
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t('finances.settleUpDebt')}
      description={t('finances.payOffBalance', { name: payee.name })}
      className="sm:max-w-md"
    >
      <div className="space-y-5 pt-2">
        {/* Payee Info Panel */}
        <div className="bg-muted/40 border border-border flex items-center justify-between p-4 rounded-xl">
          <div className="flex items-center gap-3">
            {payee.avatarUrl ? (
              <img
                src={payee.avatarUrl}
                alt={payee.name}
                className="w-10 h-10 rounded-full object-cover shadow-sm"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-600 font-bold flex items-center justify-center text-sm">
                {payee.name.charAt(0)}
              </div>
            )}
            <div>
              <span className="text-muted-foreground text-xs block">{t('finances.sendingRepaymentTo')}</span>
              <span className="text-foreground text-sm font-bold">{payee.name}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-muted-foreground text-xs block">{t('finances.amountDue')}</span>
            <span className="text-rose-600 font-headline text-lg font-extrabold">
              ${payee.amount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Method Toggle if multiple details are available */}
        {activeMethods.length > 1 && (
          <div className="flex bg-muted rounded-lg p-1 border border-border gap-1">
            {activeMethods.includes('qr_image') && (
              <button
                type="button"
                onClick={() => setMethod('qr_image')}
                className={`flex-1 text-center py-1.5 text-[10px] sm:text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1 ${
                  method === 'qr_image'
                    ? 'bg-white shadow text-primary dark:bg-card'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <QrCode className="w-3.5 h-3.5 animate-in fade-in zoom-in duration-300" />
                {t('finances.qrImage')}
              </button>
            )}
            {activeMethods.includes('promptpay_id') && (
              <button
                type="button"
                onClick={() => setMethod('promptpay_id')}
                className={`flex-1 text-center py-1.5 text-[10px] sm:text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1 ${
                  method === 'promptpay_id'
                    ? 'bg-white shadow text-primary dark:bg-card'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <QrCode className="w-3.5 h-3.5 animate-in fade-in zoom-in duration-300" />
                {t('finances.promptPayId')}
              </button>
            )}
            {activeMethods.includes('bank') && (
              <button
                type="button"
                onClick={() => setMethod('bank')}
                className={`flex-1 text-center py-1.5 text-[10px] sm:text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1 ${
                  method === 'bank'
                    ? 'bg-white shadow text-primary dark:bg-card'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 animate-in fade-in zoom-in duration-300" />
                {t('finances.bankTransfer')}
              </button>
            )}
          </div>
        )}

        {/* 1. Uploaded QR Image */}
        {method === 'qr_image' && paymentDetails?.qr_code_url && (
          <div className="flex flex-col items-center justify-center gap-3 py-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white border border-border p-3 rounded-2xl shadow-sm relative overflow-hidden">
              <img
                src={paymentDetails.qr_code_url}
                alt="PromptPay QR Code Image"
                className="w-48 h-48 object-contain"
              />
              <div className="absolute inset-x-0 bottom-0 bg-emerald-600 text-white text-[8px] font-bold text-center py-0.5 uppercase tracking-widest">
                {t('finances.promptPayQrImage')}
              </div>
            </div>
            <p className="text-muted-foreground text-[10px] text-center max-w-xs leading-normal">
              {t('finances.scanQrApp')}
            </p>
          </div>
        )}

        {/* 2. Dynamic PromptPay QR / ID display */}
        {method === 'promptpay_id' && (
          <div className="flex flex-col items-center justify-center gap-3 py-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {dynamicQrUrl && (
              <div className="bg-white border border-border p-3 rounded-2xl shadow-sm relative overflow-hidden">
                <img
                  src={dynamicQrUrl}
                  alt="Dynamic PromptPay QR Code"
                  className="w-48 h-48 object-contain"
                />
                <div className="absolute inset-x-0 bottom-0 bg-blue-600 text-white text-[8px] font-bold text-center py-0.5 uppercase tracking-widest">
                  {t('finances.promptPayDynamicQr')}
                </div>
              </div>
            )}

            {promptPayId && (
              <div className="flex items-center gap-2 bg-blue-50/50 border border-blue-100 rounded-xl px-3 py-1.5 dark:bg-slate-900/40 dark:border-blue-950/20">
                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase">
                  {t('finances.promptPayId')}:
                </span>
                <span className="text-foreground text-xs font-bold font-mono">{promptPayId}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(promptPayId, 'promptpay')}
                  className="text-muted-foreground hover:text-foreground transition-colors ml-1"
                >
                  {copiedText === 'promptpay' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 animate-in fade-in duration-300" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            )}
            <p className="text-muted-foreground text-[10px] text-center max-w-xs leading-normal">
              <Trans
                i18nKey="finances.scanQrAnyApp"
                values={{ amount: payee.amount.toFixed(2) }}
                components={{ 1: <b /> }}
              />
            </p>
          </div>
        )}

        {/* 3. Bank Account Details Transfer */}
        {method === 'bank' && (
          <div className="space-y-3 bg-muted/20 border border-border rounded-xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between border-b border-border pb-2 last:border-0">
              <span className="text-muted-foreground text-xs font-semibold">{t('finances.bankName')}</span>
              <span className="text-foreground text-xs font-bold uppercase">{paymentDetails?.bank_name}</span>
            </div>

            <div className="flex items-center justify-between border-b border-border pb-2 last:border-0">
              <span className="text-muted-foreground text-xs font-semibold">{t('finances.bankAccountName')}</span>
              <span className="text-foreground text-xs font-bold">{paymentDetails?.bank_account_name || payee.name}</span>
            </div>

            <div className="flex items-center justify-between py-1 last:border-0">
              <span className="text-muted-foreground text-xs font-semibold">{t('finances.accountNumber')}</span>
              <div className="flex items-center gap-2">
                <span className="text-foreground text-xs font-bold font-mono">{paymentDetails?.bank_account_number}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(paymentDetails?.bank_account_number || '', 'bank')}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copiedText === 'bank' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 animate-in fade-in duration-300" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* No payment details available */}
        {activeMethods.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-xs space-y-1.5 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-300 animate-in fade-in duration-300">
            <h4 className="font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
              {t('finances.noPaymentDetails')}
            </h4>
            <p className="leading-relaxed">
              {t('finances.noPaymentDetailsDesc', { name: payee.name })}
            </p>
          </div>
        )}

        {/* Confirm Settlement Buttons */}
        <div className="border-t border-border pt-4 flex flex-col gap-2">
          <Button
            disabled={isSubmitting}
            onClick={handleConfirm}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 rounded-xl shadow-sm shadow-emerald-600/10 flex items-center justify-center gap-1.5 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSubmitting ? t('finances.recordingRepayment') : t('finances.markAsPaid')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full text-xs h-9 rounded-xl border border-border hover:bg-muted font-bold transition-colors"
          >
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

