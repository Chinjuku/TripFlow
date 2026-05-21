import { useState, type ReactNode } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@trip-flow/ui/components/button';
import { TripSidebar } from './sidebar/TripSidebar';

interface TripLayoutProps {
  tripId: string;
  children: ReactNode;
}

export function TripLayout({ tripId, children }: TripLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="bg-background text-foreground flex min-h-screen antialiased">
      <TripSidebar tripId={tripId} open={sidebarOpen} onOpenChange={setSidebarOpen} />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="bg-card/80 border-border flex h-16 items-center justify-between border-b px-5 backdrop-blur-md md:hidden">
          <span className="font-headline text-primary text-lg font-bold tracking-tight">
            TripFlow
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="text-muted-foreground hover:text-foreground"
            title="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-8 md:px-10">{children}</main>
      </div>
    </div>
  );
}
