import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { Button } from '@trip-flow/ui/components/button';
import { Compass, Map, Settings, Menu, X, LogOut } from 'lucide-react';

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, signOut } = useAuth();

  const navigation = [
    { name: 'Dashboard', to: '/dashboard', icon: Compass },
    { name: 'My Trips', to: '/trips/1', icon: Map }, // dynamic/static default
    { name: 'Settings', to: '/settings', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Sidebar Shell */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-900 bg-slate-950/80 backdrop-blur-md transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-900">
          <span className="text-xl font-bold tracking-wider bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            TripFlow
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-slate-400 hover:text-slate-100 hover:bg-slate-900"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1.5 px-4 py-6">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600/20 to-purple-600/10 text-indigo-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] border border-indigo-500/20'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100 border border-transparent'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* User Info & Sign Out */}
        <div className="p-4 border-t border-slate-900 flex items-center gap-3">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="h-10 w-10 rounded-full border border-slate-800 object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm font-bold">
              {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">
              {user?.name ?? 'Traveller'}
            </p>
            <p className="text-xs text-slate-500 truncate">{user?.email ?? ''}</p>
          </div>
          <Button
            id="sign-out-button"
            variant="ghost"
            size="icon"
            className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 shrink-0"
            onClick={() => void signOut()}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Mobile Navbar */}
        <header className="flex h-16 items-center justify-between border-b border-slate-900 px-6 bg-slate-950/80 backdrop-blur-md md:hidden">
          <span className="text-lg font-semibold tracking-wide text-slate-200">TripFlow</span>
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-slate-100 hover:bg-slate-900"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>
        </header>

        {/* Dynamic Nested Routes */}
        <main className="flex-1 overflow-y-auto px-6 py-8 md:px-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
