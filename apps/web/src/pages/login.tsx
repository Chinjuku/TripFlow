import { Navigate } from 'react-router-dom';
import { SpinningCompass } from '@/components/ui/SpinningCompass';
import { useAuth } from '@/hooks/useAuth';
import { LoginHeroPanel } from '@/components/feat/auth/LoginHeroPanel';
import { LoginSignInPanel } from '@/components/feat/auth/LoginSignInPanel';

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="bg-background fixed inset-0 flex items-center justify-center">
        <SpinningCompass size={10} className="text-primary" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/trips" replace />;
  }

  return (
    <div className="bg-background text-foreground fixed inset-0 flex antialiased">
      <LoginHeroPanel />
      <LoginSignInPanel />
    </div>
  );
}
