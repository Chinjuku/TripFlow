import { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@trip-flow/ui/components/card';
import { Input } from '@trip-flow/ui/components/input';
import { Label } from '@trip-flow/ui/components/label';
import { Button } from '@trip-flow/ui/components/button';
import {
  CreditCard,
  QrCode,
  Save,
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  User,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useResource } from '@/hooks/useResource';
import { getPaymentDetails, savePaymentDetails } from '@/components/feat/finances/api';
import { BankSelect } from '@/components/feat/finances/BankSelect';
import jsQR from 'jsqr';
import { parse } from 'promptparse';

type PaymentChannel = 'promptpay' | 'banking';

interface SubTag {
  id: string;
  value: string;
}

export function PaymentDetailsCard() {
  const { t } = useTranslation();
  const { data: initialDetails, isLoading, refresh } = useResource(getPaymentDetails, []);

  const [promptpayId, setPromptpayId] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  // activeTab drives both the form view AND the preferred channel — one source of truth
  const [activeTab, setActiveTab] = useState<PaymentChannel>('promptpay');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialDetails) {
      setPromptpayId(initialDetails.promptpay_id || '');
      setBankName(initialDetails.bank_name || '');
      setBankAccountNumber(initialDetails.bank_account_number || '');
      setBankAccountName(initialDetails.bank_account_name || '');
      setQrCodeUrl(initialDetails.qr_code_url || null);
      setActiveTab(initialDetails.is_show_mobile_banking ? 'banking' : 'promptpay');
    }
  }, [initialDetails]);

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaveError(null);

    if (file.size > 5 * 1024 * 1024) {
      setSaveError(t('settings.errorQrSize'));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setQrCodeUrl(dataUrl);

      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const decoded = jsQR(imageData.data, imageData.width, imageData.height);

          if (decoded?.data) {
            try {
              const parsed = parse(decoded.data);
              if (parsed) {
                const tag29 = parsed.getTag('29');
                if (tag29?.subTags) {
                  const subTag01 = (tag29.subTags as SubTag[]).find((sub) => sub.id === '01');
                  if (subTag01?.value) {
                    let extractedId = subTag01.value;
                    // PromptPay QR encodes phone as 0066XXXXXXXXX — normalize to 0XXXXXXXXX
                    if (extractedId.startsWith('0066')) {
                      extractedId = '0' + extractedId.substring(4);
                    }
                    setPromptpayId(extractedId);
                  }
                }
              }
            } catch {
              // QR is valid image but not a PromptPay EMVCo payload — ignore silently
            }
          }
        } catch {
          // Canvas decode failed — QR preview still shown, just no auto-fill
        }
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      setSaveError(t('settings.errorQrRead'));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    const trimmedBankName = bankName.trim();
    const trimmedBankAccountNumber = bankAccountNumber.trim();
    const trimmedBankAccountName = bankAccountName.trim();

    const hasBankName = !!trimmedBankName;
    const hasBankAccountNumber = !!trimmedBankAccountNumber;
    const hasBankAccountName = !!trimmedBankAccountName;
    const isBankComplete = hasBankName && hasBankAccountNumber && hasBankAccountName;
    const isBankPartiallyFilled =
      (hasBankName || hasBankAccountNumber || hasBankAccountName) && !isBankComplete;

    if (isBankPartiallyFilled) {
      setSaveError(t('settings.errorBankPartial'));
      setIsSaving(false);
      return;
    }

    if (activeTab === 'banking' && !isBankComplete) {
      setSaveError(t('settings.errorBankIncomplete'));
      setIsSaving(false);
      return;
    }

    if (activeTab === 'promptpay' && !promptpayId.trim() && !qrCodeUrl) {
      setSaveError(t('settings.errorPromptpayIncomplete'));
      setIsSaving(false);
      return;
    }

    try {
      await savePaymentDetails({
        promptpayId: promptpayId.trim() || null,
        bankName: trimmedBankName || null,
        bankAccountNumber: trimmedBankAccountNumber || null,
        bankAccountName: trimmedBankAccountName || null,
        qrCodeUrl: qrCodeUrl || null,
        isShowPromptpay: activeTab === 'promptpay',
        isShowMobileBanking: activeTab === 'banking',
      });
      setSaveSuccess(true);
      await refresh();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('settings.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const hasBankWarning =
    activeTab === 'banking' &&
    !(bankName.trim() && bankAccountNumber.trim() && bankAccountName.trim());
  const hasPromptpayWarning = activeTab === 'promptpay' && !(promptpayId.trim() || qrCodeUrl);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <CreditCard className="text-primary h-5 w-5" strokeWidth={1.75} />
          {t('settings.payment')}
        </CardTitle>
        <CardDescription>{t('settings.paymentFullDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <PaymentSkeleton />
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {saveSuccess && (
              <div className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 rounded-lg border p-4 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <CheckCircle className="w-5 h-5 shrink-0" />
                <span>{t('settings.savedSuccess')}</span>
              </div>
            )}

            {saveError && (
              <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-4 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            {/* Channel Tab + Preferred Channel — single selector */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <span className="text-foreground text-sm font-semibold block">
                    {t('settings.preferredChannel')}
                  </span>
                  <span className="text-muted-foreground text-xs leading-normal">
                    {t('settings.preferredChannelDesc')}
                  </span>
                </div>
                <div className="flex bg-muted rounded-lg p-1 border border-border shrink-0 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={() => setActiveTab('promptpay')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                      activeTab === 'promptpay'
                        ? 'bg-background text-foreground shadow-sm border border-border/40'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    {t('settings.promptpay')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('banking')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                      activeTab === 'banking'
                        ? 'bg-background text-foreground shadow-sm border border-border/40'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    {t('settings.mobileBanking')}
                  </button>
                </div>
              </div>

              {hasBankWarning && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{t('settings.warnBankIncomplete')}</span>
                </div>
              )}

              {hasPromptpayWarning && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{t('settings.warnPromptpayIncomplete')}</span>
                </div>
              )}
            </div>

            {/* Form fields — driven by activeTab */}
            {activeTab === 'banking' ? (
              <div className="space-y-4">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="bankName">{t('settings.bankName')}</Label>
                    <BankSelect
                      id="bankName"
                      value={bankName}
                      onChange={(val) => setBankName(val)}
                      placeholder={t('settings.bankNamePlaceholder')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bankAccountNumber">{t('settings.bankAccountNumber')}</Label>
                    <Input
                      id="bankAccountNumber"
                      placeholder={t('settings.bankAccountNumberPlaceholder')}
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bankAccountName">{t('settings.accountHolderName')}</Label>
                  <div className="relative">
                    <Input
                      id="bankAccountName"
                      placeholder={t('settings.accountHolderNamePlaceholder')}
                      value={bankAccountName}
                      onChange={(e) => setBankAccountName(e.target.value)}
                      className="pl-10"
                    />
                    <User
                      className="text-muted-foreground absolute left-3 top-2.5 h-5 w-5"
                      strokeWidth={1.75}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="promptpay">{t('settings.promptpayId')}</Label>
                  <div className="relative">
                    <Input
                      id="promptpay"
                      placeholder={t('settings.promptpayIdPlaceholder')}
                      value={promptpayId}
                      onChange={(e) => setPromptpayId(e.target.value)}
                      className="pl-10"
                    />
                    <QrCode
                      className="text-muted-foreground absolute left-3 top-2.5 h-5 w-5"
                      strokeWidth={1.75}
                    />
                  </div>
                  <p className="text-muted-foreground text-xs">{t('settings.promptpayIdHint')}</p>
                </div>

                <div className="space-y-2">
                  <Label>{t('settings.promptpayQr')}</Label>
                  {qrCodeUrl ? (
                    <div className="relative group overflow-hidden rounded-xl border border-border bg-muted/30 p-4 max-w-sm mx-auto flex flex-col items-center gap-4 transition-all duration-300 hover:border-primary/40">
                      <div className="relative h-48 w-48 overflow-hidden rounded-lg bg-white border p-2 flex items-center justify-center shadow-md">
                        <img
                          src={qrCodeUrl}
                          alt={t('settings.promptpayQr')}
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setQrCodeUrl(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        {t('settings.removeQr')}
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-border hover:border-primary/50 bg-muted/10 hover:bg-muted/20 transition-all duration-300 rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer group text-center"
                    >
                      <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Upload className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-foreground text-sm font-semibold">
                          {t('settings.uploadQr')}
                        </p>
                        <p className="text-muted-foreground text-xs mt-1">
                          {t('settings.uploadQrHint')}
                        </p>
                      </div>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    id="qr-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleQrUpload}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
                {isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    {t('common.saving')}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {t('settings.savePayment')}
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function PaymentSkeleton() {
  return (
    <div className="space-y-6">
      {/* Channel selector skeleton */}
      <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1.5">
            <div className="h-4 w-40 bg-muted animate-pulse rounded" />
            <div className="h-3 w-56 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-9 w-44 bg-muted animate-pulse rounded-lg shrink-0" />
        </div>
      </div>
      {/* Fields skeleton */}
      <div className="space-y-2">
        <div className="h-4 w-28 bg-muted animate-pulse rounded" />
        <div className="h-10 bg-muted animate-pulse rounded-md" />
        <div className="h-3 w-48 bg-muted animate-pulse rounded" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-36 bg-muted animate-pulse rounded" />
        <div className="h-40 bg-muted animate-pulse rounded-xl" />
      </div>
      {/* Save button skeleton */}
      <div className="flex justify-end pt-4">
        <div className="h-9 w-44 bg-muted animate-pulse rounded-md" />
      </div>
    </div>
  );
}
