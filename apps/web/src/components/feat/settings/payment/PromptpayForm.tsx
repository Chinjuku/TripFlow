import { useRef } from 'react';
import { QrCode, Upload, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '@trip-flow/ui/components/input';
import { Label } from '@trip-flow/ui/components/label';
import { Button } from '@trip-flow/ui/components/button';
import { extractPromptpayId } from '@/utils/payment';

interface PromptpayFormProps {
  promptpayId: string;
  qrCodeUrl: string | null;
  onPromptpayIdChange: (value: string) => void;
  onQrCodeUrlChange: (value: string | null) => void;
  onError: (message: string | null) => void;
}

/** PromptPay fields: the ID input + a QR uploader that auto-fills the ID. */
export function PromptpayForm({
  promptpayId,
  qrCodeUrl,
  onPromptpayIdChange,
  onQrCodeUrlChange,
  onError,
}: PromptpayFormProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    onError(null);
    if (file.size > 5 * 1024 * 1024) {
      onError(t('settings.errorQrSize'));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      onQrCodeUrlChange(dataUrl);
      // Best-effort auto-fill - failures leave whatever the user typed.
      void extractPromptpayId(dataUrl)
        .then((id) => {
          if (id) onPromptpayIdChange(id);
        })
        .catch(() => {});
    };
    reader.onerror = () => onError(t('settings.errorQrRead'));
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="promptpay">{t('settings.promptpayId')}</Label>
        <div className="relative">
          <Input
            id="promptpay"
            placeholder={t('settings.promptpayIdPlaceholder')}
            value={promptpayId}
            onChange={(e) => onPromptpayIdChange(e.target.value)}
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
          <div className="group border-border hover:border-primary/40 bg-muted/30 relative mx-auto flex max-w-sm flex-col items-center gap-4 overflow-hidden rounded-xl border p-4 transition-all duration-300">
            <div className="relative flex h-48 w-48 items-center justify-center overflow-hidden rounded-lg border bg-white p-2 shadow-md">
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
                onQrCodeUrlChange(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            >
              <X className="mr-2 h-4 w-4" />
              {t('settings.removeQr')}
            </Button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-border hover:border-primary/50 bg-muted/10 hover:bg-muted/20 group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-all duration-300"
          >
            <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110">
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <p className="text-foreground text-sm font-semibold">{t('settings.uploadQr')}</p>
              <p className="text-muted-foreground mt-1 text-xs">{t('settings.uploadQrHint')}</p>
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
  );
}
