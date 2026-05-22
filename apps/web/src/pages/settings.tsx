import { ProfileCard, AppearanceCard, PaymentDetailsCard } from '@/features/settings';

export default function SettingsPage() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 mx-auto max-w-3xl space-y-8 duration-500 ease-out">
      <div>
        <h1 className="font-headline text-foreground text-3xl font-extrabold tracking-tight">
          Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and preferences.
        </p>
      </div>

      {/* Profile Information */}
      <ProfileCard />

      {/* Appearance & Themes */}
      <AppearanceCard />

      {/* Repayment and Financial Details */}
      <PaymentDetailsCard />
    </div>
  );
}
