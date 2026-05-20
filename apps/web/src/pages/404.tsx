import React from 'react';
import { Link } from 'react-router-dom';
import { buttonVariants } from '@trip-flow/ui/components/button';
import { Compass, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 gap-6">
      <div className="relative flex items-center justify-center h-24 w-24 rounded-full bg-slate-900 border border-slate-800 text-indigo-400">
        <div className="absolute inset-0 rounded-full bg-indigo-500/10 blur-xl animate-pulse" />
        <Compass className="h-12 w-12 animate-spin-slow" />
      </div>

      <div className="space-y-2 max-w-md">
        <h1 className="text-4xl font-extrabold tracking-tight text-white">404</h1>
        <h2 className="text-xl font-bold text-slate-300">Journey Interrupted</h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          The path you are looking for has been moved or does not exist. Let's redirect your compass
          back to the main map.
        </p>
      </div>

      <Link
        to="/dashboard"
        className={`${buttonVariants({ variant: 'default' })} bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl gap-2 font-medium px-5 mt-2`}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>
    </div>
  );
}
