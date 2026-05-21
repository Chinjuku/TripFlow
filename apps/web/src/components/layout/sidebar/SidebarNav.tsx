import { NavLink } from 'react-router-dom';
import { Calendar, Map, ThumbsUp, Wallet, type LucideIcon } from 'lucide-react';
import { cn } from '@trip-flow/ui/lib/cn';

interface NavItem {
  name: string;
  to: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Plan', to: '/plan', icon: Map },
  { name: 'Schedule', to: '/schedule', icon: Calendar },
  { name: 'Voting', to: '/voting', icon: ThumbsUp },
  { name: 'Finances', to: '/finances', icon: Wallet },
];

interface SidebarNavProps {
  collapsed: boolean;
  onNavigate: () => void;
}

export function SidebarNav({ collapsed, onNavigate }: SidebarNavProps) {
  return (
    <nav className="flex-1 space-y-2 overflow-y-auto overflow-x-hidden px-3 py-4">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.name}
            to={item.to}
            onClick={onNavigate}
            title={collapsed ? item.name : undefined}
            className={({ isActive }) =>
              cn(
                'group flex items-center rounded-xl text-sm font-medium transition-colors',
                collapsed ? 'h-12 justify-center px-2' : 'h-12 gap-4 px-4',
                isActive
                  ? 'bg-primary text-primary-foreground/80'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )
            }
          >
            <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
            {!collapsed && <span className="truncate text-base">{item.name}</span>}
          </NavLink>
        );
      })}
    </nav>
  );
}
