import { Link, Outlet } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { UserMenu } from './UserMenu';

/**
 * Lightweight shell used for non-trip pages (Trips list, Settings, etc.).
 * No sidebar — those belong inside a specific trip's workspace.
 */
export function GlobalLayout() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col antialiased">
      <header className="border-border bg-card/80 supports-[backdrop-filter]:bg-card/60 sticky top-0 z-40 border-b backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/trips" className="flex items-center gap-2.5">
            <div className="border-primary text-primary flex h-9 w-9 items-center justify-center rounded-full border-2">
              <Compass className="h-4 w-4" strokeWidth={2} />
            </div>
            <span className="font-headline text-primary text-lg font-bold tracking-tight">
              TripFlow
            </span>
          </Link>

          <UserMenu />
        </div>
      </header>

      <main className="flex-1 px-6 py-8 md:px-10">
        <Outlet />
      </main>
    </div>
  );
}
