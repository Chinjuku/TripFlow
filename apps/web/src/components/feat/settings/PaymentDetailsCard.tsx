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
import { useResource } from '@/hooks/useResource';
import { getPaymentDetails, savePaymentDetails } from '@/components/feat/finances/api';
import { BankSelect } from '@/components/feat/finances/BankSelect';
import jsQR from 'jsqr';
import { parse } from 'promptparse';

export function PaymentDetailsCard() {
  const { data: initialDetails, isLoading, refresh } = useResource(getPaymentDetails, []);

  const [promptpayId, setPromptpayId] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'promptpay' | 'banking'>('promptpay');
  const [preferredChannel, setPreferredChannel] = useState<'promptpay' | 'banking'>('promptpay');

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
      if (initialDetails.is_show_mobile_banking) {
        setPreferredChannel('banking');
      } else {
        setPreferredChannel('promptpay');
      }
    }
  }, [initialDetails]);

  // Handle QR File Upload
  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (limit to 5MB to be safe with base64/db limits)
    if (file.size > 5 * 1024 * 1024) {
      setSaveError('Image must be smaller than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setQrCodeUrl(dataUrl);
      setSaveError(null);

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
            console.log('Decoded QR Code string:', decoded.data);
            try {
              const parsed = parse(decoded.data);
              console.log('Parsed PromptPay EMVCo payload:', parsed);

              if (parsed) {
                // Auto-fill promptpayId if a PromptPay tag (Tag 29) is found
                const tag29 = parsed.getTag('29');
                if (tag29 && tag29.subTags) {
                  const nameTag = parsed.getTag('59');
                  console.log('--- QR Tag 59 (Recipient Name) ---');
                  console.log('Raw Tag 59 value:', nameTag ? nameTag.value : 'Not found');

                  const subTag01 = tag29.subTags.find((sub: any) => sub.id === '01');
                  if (subTag01 && subTag01.value) {
                    let extractedId = subTag01.value;
                    // Normalize phone format: if 0066XXXXXXXXX, convert to 0XXXXXXXXX
                    if (extractedId.startsWith('0066')) {
                      extractedId = '0' + extractedId.substring(4);
                    }
                    console.log('Extracted PromptPay ID from QR:', extractedId);
                    setPromptpayId(extractedId);
                  }
                }
              }
            } catch (parseErr) {
              console.error('Failed to parse PromptPay EMVCo payload using promptparse:', parseErr);
            }
          } else {
            console.log('No QR code detected in the uploaded image.');
          }
        } catch (decodeErr) {
          console.error('Error decoding QR code image:', decodeErr);
        }
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      setSaveError('Failed to read QR image file');
    };
    reader.readAsDataURL(file);
  };

  // Handle Save Payment Details
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

    const isBankPartiallyFilled = (hasBankName || hasBankAccountNumber || hasBankAccountName) &&
      !(hasBankName && hasBankAccountNumber && hasBankAccountName);

    if (isBankPartiallyFilled) {
      setSaveError('All three bank fields (Bank Name, Account Number, and Account Holder Name) must be filled, or all left empty.');
      setIsSaving(false);
      return;
    }

    if (preferredChannel === 'banking') {
      if (!hasBankName || !hasBankAccountNumber || !hasBankAccountName) {
        setSaveError('Cannot select Mobile Banking as your preferred receiving channel because your bank details are incomplete. Please fill in Bank Name, Account Number, and Account Holder Name.');
        setIsSaving(false);
        return;
      }
    }

    const hasPromptPayId = !!promptpayId.trim();
    const hasPromptPayQr = !!qrCodeUrl;
    if (preferredChannel === 'promptpay') {
      if (!hasPromptPayId && !hasPromptPayQr) {
        setSaveError('Cannot select PromptPay as your preferred receiving channel because your PromptPay details are incomplete. Please provide a PromptPay ID or upload a QR Code image.');
        setIsSaving(false);
        return;
      }
    }

    try {
      await savePaymentDetails({
        promptpayId: promptpayId.trim() || null,
        bankName: trimmedBankName || null,
        bankAccountNumber: trimmedBankAccountNumber || null,
        bankAccountName: trimmedBankAccountName || null,
        qrCodeUrl: qrCodeUrl || null,
        isShowPromptpay: preferredChannel === 'promptpay',
        isShowMobileBanking: preferredChannel === 'banking',
      });
      setSaveSuccess(true);
      await refresh();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('[payment-details] save failed', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save payment details');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <CreditCard className="text-primary h-5 w-5" strokeWidth={1.75} />
          Payment Details
        </CardTitle>
        <CardDescription>
          Provide your payment options (e.g. PromptPay or Bank Account) so other trip members can settle up with you easily.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-10 bg-muted animate-pulse rounded-md" />
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                <div className="h-10 bg-muted animate-pulse rounded-md" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                <div className="h-10 bg-muted animate-pulse rounded-md" />
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {saveSuccess && (
              <div className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 rounded-lg border p-4 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <CheckCircle className="w-5 h-5 shrink-0" />
                <span>Payment details saved successfully!</span>
              </div>
            )}

            {saveError && (
              <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-4 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            {/* Glassmorphic Tab Selector */}
            <div className="flex p-1 bg-muted/60 backdrop-blur-md rounded-xl border border-border max-w-md mx-auto mb-6">
              <button
                type="button"
                onClick={() => setActiveTab('promptpay')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ${
                  activeTab === 'promptpay'
                    ? 'bg-background text-foreground shadow-sm border border-border/40'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                }`}
              >
                <QrCode className="h-4 w-4" />
                PromptPay
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('banking')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ${
                  activeTab === 'banking'
                    ? 'bg-background text-foreground shadow-sm border border-border/40'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                }`}
              >
                <CreditCard className="h-4 w-4" />
                Mobile Banking
              </button>
            </div>

            {/* Preferred Channel Selector */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 max-w-xl mx-auto mb-6 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <span className="text-foreground text-sm font-semibold block">Preferred Receiving Channel</span>
                  <span className="text-muted-foreground text-xs leading-normal">
                    Select which channel is shown to other users for settles (only one can be active).
                  </span>
                </div>
                <div className="flex bg-muted rounded-lg p-1 border border-border shrink-0 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={() => setPreferredChannel('promptpay')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                      preferredChannel === 'promptpay'
                        ? 'bg-background text-foreground shadow-sm border border-border/40'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    PromptPay
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreferredChannel('banking')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                      preferredChannel === 'banking'
                        ? 'bg-background text-foreground shadow-sm border border-border/40'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Mobile Banking
                  </button>
                </div>
              </div>

              {preferredChannel === 'banking' && !(bankName.trim() && bankAccountNumber.trim() && bankAccountName.trim()) && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Please fill in all Mobile Banking fields (Bank Name, Account Number, and Account Holder Name) before saving.</span>
                </div>
              )}

              {preferredChannel === 'promptpay' && !(promptpayId.trim() || qrCodeUrl) && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Please fill in your PromptPay ID or upload a QR Code image before saving.</span>
                </div>
              )}
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              {activeTab === 'banking' ? (
                <div className="space-y-4 sm:col-span-2">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="bankName">Bank Name</Label>
                      <BankSelect
                        id="bankName"
                        value={bankName}
                        onChange={(val) => setBankName(val)}
                        placeholder="Search or select a bank…"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bankAccountNumber">Bank Account Number</Label>
                      <Input
                        id="bankAccountNumber"
                        placeholder="e.g. 123-4-56789-0"
                        value={bankAccountNumber}
                        onChange={(e) => setBankAccountNumber(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bankAccountName">Account Holder Name</Label>
                    <div className="relative">
                      <Input
                        id="bankAccountName"
                        placeholder="e.g. John Doe"
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
                <div className="space-y-4 sm:col-span-2">
                  <div className="space-y-2">
                    <Label htmlFor="promptpay">PromptPay ID</Label>
                    <div className="relative">
                      <Input
                        id="promptpay"
                        placeholder="e.g. 0812345678 or 1100200030004"
                        value={promptpayId}
                        onChange={(e) => setPromptpayId(e.target.value)}
                        className="pl-10"
                      />
                      <QrCode
                        className="text-muted-foreground absolute left-3 top-2.5 h-5 w-5"
                        strokeWidth={1.75}
                      />
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Your mobile number or citizen ID linked to PromptPay.
                    </p>
                  </div>

                  {/* PromptPay QR Image Upload */}
                  <div className="space-y-2">
                    <Label>PromptPay QR Code Image</Label>
                    {qrCodeUrl ? (
                      <div className="relative group overflow-hidden rounded-xl border border-border bg-muted/30 p-4 max-w-sm mx-auto flex flex-col items-center gap-4 transition-all duration-300 hover:border-primary/40">
                        <div className="relative h-48 w-48 overflow-hidden rounded-lg bg-white border p-2 flex items-center justify-center shadow-md">
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
                          className="w-full"
                          onClick={() => {
                            setQrCodeUrl(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Remove QR Code
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
                          <p className="text-foreground text-sm font-semibold">Upload PromptPay QR image</p>
                          <p className="text-muted-foreground text-xs mt-1">PNG, JPG, or WEBP up to 5MB</p>
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
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
                {isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Payment Details
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
