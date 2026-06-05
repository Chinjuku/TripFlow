import { createContext, useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Check, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Toast, ToastContextValue, ToastVariant } from '@/types/toast';

export const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 4000;

const VARIANT_STYLES: Record<ToastVariant, { wrapper: string; icon: typeof Check }> = {
  success: { wrapper: 'bg-primary text-primary-foreground border-primary/10', icon: Check },
  error: {
    wrapper: 'bg-destructive text-destructive-foreground border-destructive/10',
    icon: AlertCircle,
  },
  info: { wrapper: 'bg-card text-foreground border-border', icon: Info },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'success') => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      success: (message: string) => showToast(message, 'success'),
      error: (message: string) => showToast(message, 'error'),
      info: (message: string) => showToast(message, 'info'),
    }),
    [showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-2">
        {toasts.map((toast) => {
          const { wrapper, icon: Icon } = VARIANT_STYLES[toast.variant];
          return (
            <div
              key={toast.id}
              role="status"
              className={cn(
                'flex items-center gap-3 py-3.5 px-5 rounded-xl shadow-xl border',
                'animate-in fade-in-0 slide-in-from-bottom-5 duration-300',
                wrapper,
              )}
            >
              <div className="bg-white/20 p-1 rounded-lg shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-xs md:text-sm font-bold tracking-wide font-label">
                {toast.message}
              </span>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
