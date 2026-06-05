import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { buttonVariants } from '@/components/ui/button';
import { Compass, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 gap-6">
      <div className="relative flex items-center justify-center h-24 w-24 rounded-full bg-slate-900 border border-slate-800 text-indigo-400">
        <div className="absolute inset-0 rounded-full bg-indigo-500/10 blur-xl animate-pulse" />
        <Compass className="h-12 w-12 animate-spin-slow" />
      </div>

      <div className="space-y-2 max-w-md">
        <h1 className="text-4xl font-extrabold tracking-tight text-white">{t('notFound.title')}</h1>
        <h2 className="text-xl font-bold text-slate-300">{t('notFound.heading')}</h2>
        <p className="text-sm text-slate-500 leading-relaxed">{t('notFound.description')}</p>
      </div>

      <Link to="/trips" className={`${buttonVariants({ variant: 'default' })} gap-2 px-5`}>
        <ArrowLeft className="h-4 w-4" />
        {t('notFound.backToTrips')}
      </Link>
    </div>
  );
}
