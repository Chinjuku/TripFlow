import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ProfileCard, AppearanceCard, PaymentDetailsCard, SettingsTabs, useSettingsTab } from '@/components/feat/settings';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab] = useSettingsTab();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 mx-auto max-w-3xl space-y-6 duration-500 ease-out">
      <div className="space-y-1">
        <button
          onClick={() => navigate(-1)}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-semibold transition-colors md:hidden"
          title={t('common.back')}
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
          {t('common.back')}
        </button>

        <div>
          <h1 className="font-headline text-foreground text-3xl font-extrabold tracking-tight">
            {t('settings.title')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('settings.subtitle')}
          </p>
        </div>
      </div>

      <SettingsTabs />

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeTab === 'profile' && <ProfileCard />}
        {activeTab === 'appearance' && <AppearanceCard />}
        {activeTab === 'payment' && <PaymentDetailsCard />}
      </div>
    </div>
  );
}
