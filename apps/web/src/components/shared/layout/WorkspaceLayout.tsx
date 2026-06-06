import { type ReactNode } from 'react';
import { TripSidebar } from './sidebar/TripSidebar';
import { BottomNav } from './BottomNav';

interface WorkspaceLayoutProps {
  tripId: string;
  children: ReactNode;
}

export function WorkspaceLayout({ tripId, children }: WorkspaceLayoutProps) {
  return (
    <div className="bg-background text-foreground flex min-h-screen md:h-screen md:overflow-hidden antialiased">
      {/* Desktop Sidebar: Only visible on md and up, acts as a sticky sidebar */}
      <TripSidebar tripId={tripId} open={false} onOpenChange={() => {}} />

      <div className="flex min-h-screen md:min-h-0 md:h-full min-w-0 flex-1 flex-col">
        {/* Main content with bottom padding on mobile to accommodate the BottomBar */}
        <main className="flex-1 overflow-y-auto px-5 pt-6 pb-28 md:py-8 md:px-10">{children}</main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav tripId={tripId} />
    </div>
  );
}
