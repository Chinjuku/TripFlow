import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Button } from '@trip-flow/ui/components/button';
import { cn } from '@trip-flow/ui/lib/cn';
import { useAuth } from '@/features/auth/useAuth';

interface SidebarFooterProps {
  collapsed: boolean;
  onNavigate: () => void;
}

export function SidebarFooter({ collapsed, onNavigate }: SidebarFooterProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleProfile = () => {
    navigate('/settings');
    onNavigate();
  };

  return (
    <div
      className={cn(
        'border-border flex border-t p-3 transition-all',
        collapsed ? 'flex-col items-center gap-2' : 'items-center gap-3',
      )}
    >
      <button
        type="button"
        onClick={handleProfile}
        title="Profile settings"
        className="focus-visible:ring-ring shrink-0 rounded-full ring-2 ring-transparent transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            referrerPolicy="no-referrer"
            className="border-border h-9 w-9 rounded-full border object-cover"
          />
        ) : (
          <div className="bg-primary text-primary-foreground flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold">
            {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
        )}
      </button>

      {!collapsed && (
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-sm font-medium">
            {user?.name ?? 'Traveller'}
          </p>
          <p className="text-muted-foreground truncate text-xs">{user?.email ?? ''}</p>
        </div>
      )}

      <Button
        variant="ghost"
        size="icon"
        title="Sign out"
        onClick={() => void signOut()}
        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
