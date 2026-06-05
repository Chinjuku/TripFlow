import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  ProfileCard,
  AppearanceCard,
  PaymentDetailsCard,
  NotificationsCard,
  SettingsTabs,
  useSettingsTab,
} from '@/components/feat/accountSettings';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab] = useSettingsTab();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 mx-auto max-w-5xl space-y-5 duration-500 ease-out sm:space-y-6">
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
          <h1 className="font-headline text-foreground text-2xl font-extrabold tracking-tight sm:text-3xl">
            {t('settings.title')}
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm sm:mt-2 sm:text-base">
            {t('settings.subtitle')}
          </p>
        </div>
      </div>

      {/* Desktop: floating sidebar card (left) + content (right).
          Mobile: horizontal pill tabs stacked above content. */}
      <div className="md:grid md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6 md:items-start">
        {/* Mobile tabs */}
        <div className="mb-5 md:hidden">
          <SettingsTabs orientation="horizontal" />
        </div>

        {/* Desktop floating sidebar - sticky so it follows on scroll. */}
        <aside className="hidden md:block md:sticky md:top-6">
          <SettingsTabs orientation="vertical" />
        </aside>

        <div key={activeTab} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {activeTab === 'profile' && <ProfileCard />}
          {activeTab === 'appearance' && <AppearanceCard />}
          {activeTab === 'payment' && <PaymentDetailsCard />}
          {activeTab === 'notifications' && <NotificationsCard />}
        </div>
      </div>
    </div>
  );
}
