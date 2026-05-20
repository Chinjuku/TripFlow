import React, { useState } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { Button } from '@trip-flow/ui/components/button';
import { Compass, Map, MessageSquare, Settings, Menu, X, User } from 'lucide-react';

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
          <Link to="/new">
            <button>Create New Trip</button>
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-900 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 border border-slate-800">
            <User className="h-5 w-5 text-slate-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">Explorer Mode</p>
            <p className="text-xs text-slate-500 truncate">active</p>
          </div>
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
