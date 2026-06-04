import { CheckCircle, CreditCard, QrCode } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type PaymentChannel = 'promptpay' | 'banking';

/** Channel cards rendered in the picker - label keys resolved via i18n.
 *  `as const` keeps `labelKey` as literal types that the typed `t()` accepts. */
const CHANNELS = [
  { value: 'promptpay', icon: QrCode, labelKey: 'settings.promptpay' },
  { value: 'banking', icon: CreditCard, labelKey: 'settings.mobileBanking' },
] as const satisfies readonly { value: PaymentChannel; icon: typeof QrCode; labelKey: string }[];

interface ChannelPickerProps {
  value: PaymentChannel;
  onChange: (channel: PaymentChannel) => void;
}

/**
 * Preferred-channel selector as a pair of visual cards (mirrors the theme and
 * language pickers): icon tile + label + selected tick.
 */
export function ChannelPicker({ value, onChange }: ChannelPickerProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div>
        <span className="text-foreground block text-sm font-semibold">
          {t('settings.preferredChannel')}
        </span>
        <span className="text-muted-foreground text-xs leading-normal">
          {t('settings.preferredChannelDesc')}
        </span>
      </div>

      <div
        role="radiogroup"
        aria-label={t('settings.preferredChannel')}
        className="grid grid-cols-2 gap-3"
      >
        {CHANNELS.map(({ value: channel, icon: Icon, labelKey }) => {
          const isActive = value === channel;
          return (
            <button
              key={channel}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onChange(channel)}
              className={`focus-visible:ring-ring flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                isActive ? 'border-primary shadow-sm' : 'border-border hover:border-primary/40'
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <span className="text-foreground flex-1 text-sm font-semibold">{t(labelKey)}</span>
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full border transition-colors ${
                  isActive ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                }`}
              >
                {isActive && <CheckCircle className="h-3 w-3" strokeWidth={3} />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
