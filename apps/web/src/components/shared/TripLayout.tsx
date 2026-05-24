import { type ReactNode } from 'react';
import { TripSidebar } from './sidebar/TripSidebar';
import { ButtomBar } from './ButtomBar';

interface TripLayoutProps {
  tripId: string;
  children: ReactNode;
}

export function TripLayout({ tripId, children }: TripLayoutProps) {
  return (
    <div className="bg-background text-foreground flex min-h-screen antialiased">
      {/* Desktop Sidebar: Only visible on md and up, acts as a sticky sidebar */}
      <TripSidebar tripId={tripId} open={false} onOpenChange={() => {}} />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        {/* Main content with bottom padding on mobile to accommodate the BottomBar */}
        <main className="flex-1 overflow-y-auto px-5 pt-6 pb-28 md:py-8 md:px-10">{children}</main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <ButtomBar tripId={tripId} />
    </div>
  );
}
