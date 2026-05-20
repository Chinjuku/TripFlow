import React from 'react';
import { Button } from '@trip-flow/ui/components/button';
import { TripCard, type Place } from '@/components/trip-card';
import { Plus, Compass, Calendar, Users, MapPin } from 'lucide-react';

const SAMPLE_PLACES: Place[] = [
  {
    id: '1',
    name: 'วัดพระศรีรัตนศาสดาราม (วัดพระแก้ว)',
    address: 'พระบรมมหาราชวัง, ถนนหน้าพระลาน, พระนคร',
    lat: 13.7515,
    lng: 100.4925,
  },
  {
    id: '2',
    name: 'ตลาดนัดจตุจักร',
    address: 'ถนนกำแพงเพชร 2, จตุจักร',
    lat: 13.7998,
    lng: 100.5501,
  },
  {
    id: '3',
    name: 'ICONSIAM',
    address: '299 ถนนเจริญนคร, คลองสาน',
    lat: 13.7264,
    lng: 100.5102,
  },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-5xl flex flex-col gap-10">
      {/* Premium Gradient Jumbotron */}
      <section className="relative overflow-hidden rounded-3xl border border-indigo-500/10 bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-purple-950/30 p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        {/* <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-indigo-500/10 blur-[100px]" />
        <div className="absolute -left-20 -bottom-20 h-60 w-60 rounded-full bg-purple-500/10 blur-[100px]" />

        <div className="relative z-10 flex flex-col gap-4 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
            <Compass className="h-3 w-3 animate-spin-slow" />
            Beta Workspace
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Plan your next journey,{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              collaboratively.
            </span>
          </h1>
          <p className="text-slate-400 text-base md:text-lg leading-relaxed">
            Drag-and-drop collaborative boards, Google Maps places integration, real-time sync, and automated cron reminders.
          </p>
          <div className="flex flex-wrap gap-4 mt-4">
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl gap-2 font-medium shadow-lg shadow-indigo-600/20 px-5 py-6">
              <Plus className="h-5 w-5" />
              Create a trip
            </Button>
            <Button variant="outline" className="border-slate-800 hover:bg-slate-900 text-slate-300 rounded-xl px-5 py-6">
              Explore templates
            </Button>
          </div>
        </div> */}
      </section>

      {/* Quick Status Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          {
            label: 'Active Trips',
            value: '4',
            desc: 'Planned across regions',
            icon: MapPin,
            color: 'text-indigo-400 bg-indigo-500/5',
          },
          {
            label: 'Collaborators',
            value: '12',
            desc: 'Friends sync active',
            icon: Users,
            color: 'text-purple-400 bg-purple-500/5',
          },
          {
            label: 'Reminders Pending',
            value: '3',
            desc: 'Cron worker polling',
            icon: Calendar,
            color: 'text-pink-400 bg-pink-500/5',
          },
        ].map((stat, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-6 rounded-2xl border border-slate-900 bg-slate-950/40 backdrop-blur-sm transition-all hover:border-slate-800 hover:bg-slate-950/80"
          >
            <div className="space-y-1">
              <span className="text-slate-500 text-sm font-medium">{stat.label}</span>
              <p className="text-3xl font-extrabold text-white">{stat.value}</p>
              <p className="text-xs text-slate-400">{stat.desc}</p>
            </div>
            <div
              className={`h-12 w-12 rounded-xl flex items-center justify-center border border-slate-900 ${stat.color}`}
            >
              <stat.icon className="h-5 w-5" />
            </div>
          </div>
        ))}
      </section>

      {/* Trips Section */}
      <section className="flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-slate-900 pb-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-white">Active Trip Planner</h2>
            <p className="text-sm text-slate-500">Bangkok one-day schedule and stops</p>
          </div>
          <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
            Realtime Active
          </span>
        </div>

        <div className="flex flex-col gap-4">
          {SAMPLE_PLACES.map((place) => (
            <TripCard key={place.id} place={place} />
          ))}
        </div>
      </section>
    </div>
  );
}
