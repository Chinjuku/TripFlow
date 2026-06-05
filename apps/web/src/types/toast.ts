export type ToastVariant = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

export interface ToastContextValue {
  /** Queues a toast; it auto-dismisses after a few seconds. */
  showToast: (message: string, variant?: ToastVariant) => void;
  /** Convenience helpers for the common variants. */
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}
