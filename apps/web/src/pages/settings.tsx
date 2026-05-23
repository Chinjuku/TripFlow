import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ProfileCard, AppearanceCard, PaymentDetailsCard } from '@/features/settings';

export default function SettingsPage() {
  const navigate = useNavigate();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 mx-auto max-w-3xl space-y-8 duration-500 ease-out">
      <div className="space-y-1">
        {/* Mobile Back Link (Matches the layout and style of trip details back links) */}
        <button
          onClick={() => navigate(-1)}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-semibold transition-colors md:hidden"
          title="Go back"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
          Back
        </button>

        <div>
          <h1 className="font-headline text-foreground text-3xl font-extrabold tracking-tight">
            Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your account settings and preferences.
          </p>
        </div>
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
