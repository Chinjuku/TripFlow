import React, { useState, useRef } from 'react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { QrCode, CreditCard, Banknote, User, Upload, X, AlertCircle } from 'lucide-react';
import type { UserPaymentDetail, SavePaymentDetailsPayload } from '@/types/finances';
import { BankSelect } from '@/components/shared/form/BankSelect';
import jsQR from 'jsqr';
import { parse } from 'promptparse';
import { useTranslation } from 'react-i18next';

interface PaymentDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDetails: UserPaymentDetail | undefined;
  onSubmit: (details: SavePaymentDetailsPayload) => Promise<void>;
  isSubmitting: boolean;
}

export function PaymentDetailsModal({
  open,
  onOpenChange,
  initialDetails,
  onSubmit,
  isSubmitting,
}: PaymentDetailsModalProps) {
  const [promptPayId, setPromptPayId] = useState(initialDetails?.promptpay_id || '');
  const [qrCodeUrl, setQrCodeUrl] = useState(initialDetails?.qr_code_url || '');
  const [bankName, setBankName] = useState(initialDetails?.bank_name || '');
  const [bankAccountNumber, setBankAccountNumber] = useState(
    initialDetails?.bank_account_number || '',
  );
  const [bankAccountName, setBankAccountName] = useState(initialDetails?.bank_account_name || '');
  const [preferredChannel, setPreferredChannel] = useState<'promptpay' | 'banking'>(
    initialDetails?.is_show_mobile_banking ? 'banking' : 'promptpay',
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { t } = useTranslation();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError(t('finances.errorImageSize'));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setQrCodeUrl(dataUrl);
      setUploadError(null);

      // Create an off-screen image element to parse the QR code
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            console.error('Could not get canvas 2d context');
            return;
          }

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const decoded = jsQR(imageData.data, imageData.width, imageData.height);

          if (decoded && decoded.data) {
            console.log('Decoded QR Code string (Modal):', decoded.data);
            try {
              const parsed = parse(decoded.data);
              console.log('Parsed PromptPay EMVCo payload (Modal):', parsed);

              if (parsed) {
                // Auto-fill promptPayId if a PromptPay tag (Tag 29) is found
                const tag29 = parsed.getTag('29');
                if (tag29 && tag29.subTags) {
                  const subTag01 = tag29.subTags.find((sub) => sub.id === '01');
                  if (subTag01 && subTag01.value) {
                    let extractedId = subTag01.value;
                    // Normalize phone format: if 0066XXXXXXXXX, convert to 0XXXXXXXXX
                    if (extractedId.startsWith('0066')) {
                      extractedId = '0' + extractedId.substring(4);
                    }
                    console.log('Extracted PromptPay ID from QR (Modal):', extractedId);
                    setPromptPayId(extractedId);
                  }
                }
              }
            } catch (parseErr) {
              console.error(
                'Failed to parse PromptPay EMVCo payload in modal using promptparse:',
                parseErr,
              );
            }
          } else {
            console.log('No QR code detected in the uploaded image.');
          }
        } catch (decodeErr) {
          console.error('Error decoding QR code image inside modal:', decodeErr);
        }
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      setUploadError(t('finances.errorReadQR'));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedBankName = bankName.trim();
    const trimmedBankAccountNumber = bankAccountNumber.trim();
    const trimmedBankAccountName = bankAccountName.trim();

    const hasBankName = !!trimmedBankName;
    const hasBankAccountNumber = !!trimmedBankAccountNumber;
    const hasBankAccountName = !!trimmedBankAccountName;

    const isBankPartiallyFilled =
      (hasBankName || hasBankAccountNumber || hasBankAccountName) &&
      !(hasBankName && hasBankAccountNumber && hasBankAccountName);

    if (isBankPartiallyFilled) {
      setUploadError(t('finances.errorBankFields'));
      return;
    }

    if (preferredChannel === 'banking') {
      if (!hasBankName || !hasBankAccountNumber || !hasBankAccountName) {
        setUploadError(t('finances.errorSelectMobileBanking'));
        return;
      }
    }

    const hasPromptPayId = !!promptPayId.trim();
    const hasPromptPayQr = !!qrCodeUrl;
    if (preferredChannel === 'promptpay') {
      if (!hasPromptPayId && !hasPromptPayQr) {
        setUploadError(t('finances.errorSelectPromptPay'));
        return;
      }
    }

    setUploadError(null);
    await onSubmit({
      promptpayId: promptPayId.trim() || null,
      qrCodeUrl: qrCodeUrl || null,
      bankName: trimmedBankName || null,
      bankAccountNumber: trimmedBankAccountNumber || null,
      bankAccountName: trimmedBankAccountName || null,
      isShowPromptpay: preferredChannel === 'promptpay',
      isShowMobileBanking: preferredChannel === 'banking',
    });
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t('finances.receivingDetails')}
      description={t('finances.receivingDetailsDesc')}
      className="sm:max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* Preferred Channel Selection */}
        <div className="space-y-2 p-3 bg-muted/40 border border-border rounded-xl">
          <Label className="text-[10px] font-bold text-muted-foreground uppercase block">
            {t('finances.preferredRepaymentMethod')}
          </Label>
          <div className="flex bg-muted rounded-lg p-1 border border-border gap-1">
            <button
              type="button"
              onClick={() => setPreferredChannel('promptpay')}
              className={`flex-1 text-center py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1 ${
                preferredChannel === 'promptpay'
                  ? 'bg-white shadow text-primary dark:bg-card'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              {t('finances.promptPay')}
            </button>
            <button
              type="button"
              onClick={() => setPreferredChannel('banking')}
              className={`flex-1 text-center py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1 ${
                preferredChannel === 'banking'
                  ? 'bg-white shadow text-primary dark:bg-card'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              {t('finances.mobileBanking')}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground leading-normal mt-1">
            {t('finances.selectedChannelDesc')}
          </p>

          {preferredChannel === 'banking' &&
            !(bankName.trim() && bankAccountNumber.trim() && bankAccountName.trim()) && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-[10px] font-medium px-2 py-1.5 rounded-lg flex items-center gap-1.5 mt-2 animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{t('finances.fillInAllBankFields')}</span>
              </div>
            )}

          {preferredChannel === 'promptpay' && !(promptPayId.trim() || qrCodeUrl) && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-[10px] font-medium px-2 py-1.5 rounded-lg flex items-center gap-1.5 mt-2 animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{t('finances.providePromptPayIdOrQr')}</span>
            </div>
          )}
        </div>

        {/* PromptPay section */}
        {preferredChannel === 'promptpay' && (
          <div className="space-y-3 p-3 bg-blue-50/30 border border-blue-100 rounded-xl dark:bg-slate-900/30 dark:border-blue-950/20">
            <h4 className="text-xs font-bold text-primary dark:text-primary/40 flex items-center gap-1.5 uppercase">
              <QrCode className="w-3.5 h-3.5" /> {t('finances.promptPayTransfer')}
            </h4>
            <div className="space-y-1">
              <Label htmlFor="promptpay-id" className="text-[10px] font-bold text-muted-foreground">
                {t('finances.promptPayIdLabel')}
              </Label>
              <Input
                id="promptpay-id"
                value={promptPayId}
                onChange={(e) => setPromptPayId(e.target.value)}
                placeholder="e.g. 0812345678 or 1100200300400"
                className="h-9 border-border bg-white text-xs dark:bg-card"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-muted-foreground">
                {t('finances.orPromptPayQrLabel')}
              </Label>
              {uploadError && (
                <p className="text-[10px] text-destructive font-semibold">{uploadError}</p>
              )}
              {qrCodeUrl ? (
                <div className="relative group overflow-hidden rounded-xl border border-border bg-muted/20 p-2 flex flex-col items-center gap-2 transition-all">
                  <div className="relative h-32 w-32 overflow-hidden rounded-lg bg-white border p-1 flex items-center justify-center shadow-sm">
                    <img
                      src={qrCodeUrl}
                      alt="PromptPay QR Code"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="w-full text-[10px] h-7 py-0"
                    onClick={() => {
                      setQrCodeUrl('');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    <X className="h-3 w-3 mr-1" />
                    {t('finances.removeQrImage')}
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border hover:border-primary/50 bg-muted/10 hover:bg-muted/20 transition-all rounded-xl p-4 flex flex-col items-center justify-center gap-1 cursor-pointer group text-center"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    <Upload className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-foreground text-[10px] font-semibold">
                      {t('finances.uploadPromptPayQr')}
                    </p>
                    <p className="text-muted-foreground text-[8px] mt-0.5">
                      {t('finances.uploadPromptPayQrFormat')}
                    </p>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                id="modal-qr-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleQrUpload}
              />
            </div>
          </div>
        )}

        {/* Bank transfer section */}
        {preferredChannel === 'banking' && (
          <div className="space-y-3 p-3 bg-purple-50/30 border border-purple-100 rounded-xl dark:bg-slate-900/30 dark:border-purple-950/20">
            <h4 className="text-xs font-bold text-primary dark:text-primary/40 flex items-center gap-1.5 uppercase">
              <CreditCard className="w-3.5 h-3.5" /> {t('finances.bankAccountTransfer')}
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="bank-name" className="text-[10px] font-bold text-muted-foreground">
                  {t('finances.bankName')}
                </Label>
                <BankSelect
                  id="bank-name"
                  value={bankName}
                  onChange={(val) => setBankName(val)}
                  placeholder="Search or select a bank…"
                  compact
                />
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="bank-acc-num"
                  className="text-[10px] font-bold text-muted-foreground"
                >
                  {t('finances.accountNumber')}
                </Label>
                <Input
                  id="bank-acc-num"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder="e.g. 123-4-56789-0"
                  className="h-9 border-border bg-white text-xs dark:bg-card"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="bank-acc-name"
                className="text-[10px] font-bold text-muted-foreground"
              >
                {t('finances.accountHolderName')}
              </Label>
              <Input
                id="bank-acc-name"
                value={bankAccountName}
                onChange={(e) => setBankAccountName(e.target.value)}
                placeholder="e.g. Elena Rostova"
                className="h-9 border-border bg-white text-xs dark:bg-card"
              />
            </div>
          </div>
        )}

        {uploadError && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-[11px] font-semibold p-2.5 rounded-xl flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="text-xs h-9 px-4 rounded-xl border border-border hover:bg-muted font-bold transition-colors"
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-9 px-5 rounded-xl font-bold shadow-sm transition-colors"
          >
            {isSubmitting ? t('finances.saving') : t('finances.saveDetails')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
