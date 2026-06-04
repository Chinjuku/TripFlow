import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@trip-flow/ui/components/card';
import { Button } from '@trip-flow/ui/components/button';
import { CreditCard, Save, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useResource } from '@/hooks/useResource';
import { getPaymentDetails, savePaymentDetails } from '@/components/feat/finances/api';
import { ChannelPicker, type PaymentChannel } from './payment/ChannelPicker';
import { BankForm } from './payment/BankForm';
import { PromptpayForm } from './payment/PromptpayForm';

export function PaymentDetailsCard() {
  const { t } = useTranslation();
  const { data: initialDetails, isLoading, refresh } = useResource(getPaymentDetails, []);

  const [promptpayId, setPromptpayId] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  // activeTab drives both the form view AND the preferred channel - one source of truth
  const [activeTab, setActiveTab] = useState<PaymentChannel>('promptpay');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
              <div className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 animate-in fade-in slide-in-from-top-2 flex items-center gap-2 rounded-lg border p-4 text-sm duration-300">
                <CheckCircle className="h-5 w-5 shrink-0" />
                <span>{t('settings.savedSuccess')}</span>
              </div>
            )}

            {saveError && (
              <div className="border-destructive/30 bg-destructive/10 text-destructive animate-in fade-in slide-in-from-top-2 flex items-center gap-2 rounded-lg border p-4 text-sm duration-300">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            <ChannelPicker value={activeTab} onChange={setActiveTab} />

            {hasBankWarning && (
              <div className="bg-destructive/10 border-destructive/20 text-destructive animate-in fade-in slide-in-from-top-1 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{t('settings.warnBankIncomplete')}</span>
              </div>
            )}

            {hasPromptpayWarning && (
              <div className="bg-destructive/10 border-destructive/20 text-destructive animate-in fade-in slide-in-from-top-1 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{t('settings.warnPromptpayIncomplete')}</span>
              </div>
            )}

            {activeTab === 'banking' ? (
              <BankForm
                bankName={bankName}
                bankAccountNumber={bankAccountNumber}
                bankAccountName={bankAccountName}
                onBankNameChange={setBankName}
                onBankAccountNumberChange={setBankAccountNumber}
                onBankAccountNameChange={setBankAccountName}
              />
            ) : (
              <PromptpayForm
                promptpayId={promptpayId}
                qrCodeUrl={qrCodeUrl}
                onPromptpayIdChange={setPromptpayId}
                onQrCodeUrlChange={setQrCodeUrl}
                onError={setSaveError}
              />
            )}

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
                {isSaving ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    {t('common.saving')}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
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
      <div className="space-y-3">
        <div className="space-y-1.5">
          <div className="bg-muted h-4 w-40 animate-pulse rounded" />
          <div className="bg-muted h-3 w-56 animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted h-14 animate-pulse rounded-xl" />
          <div className="bg-muted h-14 animate-pulse rounded-xl" />
        </div>
      </div>
      {/* Fields skeleton */}
      <div className="space-y-2">
        <div className="bg-muted h-4 w-28 animate-pulse rounded" />
        <div className="bg-muted h-10 animate-pulse rounded-md" />
        <div className="bg-muted h-3 w-48 animate-pulse rounded" />
      </div>
      <div className="space-y-2">
        <div className="bg-muted h-4 w-36 animate-pulse rounded" />
        <div className="bg-muted h-40 animate-pulse rounded-xl" />
      </div>
      {/* Save button skeleton */}
      <div className="flex justify-end pt-4">
        <div className="bg-muted h-9 w-44 animate-pulse rounded-md" />
      </div>
    </div>
  );
}
