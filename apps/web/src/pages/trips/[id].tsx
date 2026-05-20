import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@trip-flow/ui/components/button';
import { ArrowLeft, Sparkles, MapPin, Plus, Share2, MoreHorizontal, Check } from 'lucide-react';

export default function TripBoardPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="mx-auto max-w-5xl flex flex-col gap-8">
      {/* Workspace Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-900 pb-6">
        <div className="space-y-1">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-indigo-400 transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Bangkok Explorer Workspace
            </h1>
            <span className="inline-flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded text-xs font-semibold text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Sync
            </span>
          </div>
          <p className="text-slate-500 text-sm">Trip Workspace ID: {id} — Created by Chinjuku</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="border-slate-800 hover:bg-slate-900 text-slate-300 gap-2"
          >
            <Share2 className="h-4 w-4" />
            Invite
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2">
            <Sparkles className="h-4 w-4" />
            Optimize route
          </Button>
        </div>
      </div>

      {/* Columns: Kanban board placeholder + details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Drag & Drop Column placeholders */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Daily Itinerary Staging</h3>
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-200">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-col gap-4">
            {[
              {
                time: '09:00 AM',
                title: 'Grand Palace Tour',
                desc: 'Main temple checkin',
                status: 'completed',
              },
              {
                time: '01:00 PM',
                title: 'Chatuchak Weekend Market',
                desc: 'Local lunch & shopping',
                status: 'active',
              },
              {
                time: '06:00 PM',
                title: 'ICONSIAM Chao Phraya',
                desc: 'River view & dinner buffet',
                status: 'pending',
              },
            ].map((stop, idx) => (
              <div
                key={idx}
                className="relative overflow-hidden flex items-start gap-4 p-5 rounded-2xl border border-slate-900 bg-slate-950/40 hover:border-slate-800 transition-colors"
              >
                <div
                  className={`mt-1 h-6 w-6 rounded-full flex items-center justify-center border ${
                    stop.status === 'completed'
                      ? 'border-indigo-500/20 bg-indigo-500/10 text-indigo-400'
                      : stop.status === 'active'
                        ? 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                        : 'border-slate-800 bg-slate-900 text-slate-600'
                  }`}
                >
                  {stop.status === 'completed' ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <MapPin className="h-3.5 w-3.5" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-500">{stop.time}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-500 hover:text-slate-300"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                  <h4 className="text-base font-bold text-white truncate">{stop.title}</h4>
                  <p className="text-sm text-slate-400 mt-1">{stop.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Information / Details Card */}
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-white">Board Collaborators</h3>
          <div className="p-6 rounded-2xl border border-slate-900 bg-slate-950/40 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-xs text-indigo-400 font-bold">
                CJ
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">Chinjuku (Owner)</p>
                <p className="text-xs text-slate-500 truncate">Editing stops</p>
              </div>
            </div>
            <div className="flex items-center gap-3 opacity-60">
              <div className="h-8 w-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-xs text-slate-400 font-bold">
                AI
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">TripFlow Assistant</p>
                <p className="text-xs text-slate-500 truncate">Optimizing crons</p>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-bold text-white">Google Maps Deep Link</h3>
          <div className="p-6 rounded-2xl border border-slate-900 bg-indigo-950/10 border-indigo-500/5 space-y-3">
            <p className="text-xs text-slate-400 leading-relaxed">
              No API keys required. Standard Maps integrations automatically compile deep links to
              native mobile applications.
            </p>
            <a
              href="https://www.google.com/maps/dir/?api=1&origin=Grand+Palace+Bangkok&destination=ICONSIAM"
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full justify-center rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white py-3 px-4 transition-colors"
            >
              Open Route in Google Maps
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
