import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Accessible label for the dialog. Required for screen readers.
   * When `hideHeader` is true, the title is rendered visually-hidden but
   * still announced — use this when the dialog body has its own header.
   */
  title: string;
  description?: string;
  /** Hide the rendered header chrome (close button, title, description). */
  hideHeader?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Thin wrapper around the native <dialog> element so we get free focus
 * trapping, ESC-to-close, and inert backdrop without pulling in Radix.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  hideHeader,
  children,
  className,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      onClose={() => onOpenChange(false)}
      onClick={(e) => {
        if (e.target === ref.current) onOpenChange(false);
      }}
      className={cn(
        'bg-card text-card-foreground border-border w-full max-w-md rounded-2xl border p-0 shadow-xl backdrop:bg-black/50 backdrop:backdrop-blur-sm',
        'open:animate-in open:fade-in-0 open:zoom-in-95',
        className,
      )}
    >
      {hideHeader ? (
        <h2 id="modal-title" className="sr-only">
          {title}
        </h2>
      ) : (
        <div className="flex items-start justify-between gap-4 px-6 pt-6">
          <div className="space-y-1">
            <h2 id="modal-title" className="font-headline text-foreground text-xl font-bold">
              {title}
            </h2>
            {description && <p className="text-muted-foreground text-sm">{description}</p>}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground -mr-2 -mt-2 rounded-md p-2"
          >
            <CloseGlyph />
          </button>
        </div>
      )}
      <div className={cn(hideHeader ? '' : 'px-6 pb-6 pt-4')}>{children}</div>
    </dialog>
  );
}

function CloseGlyph() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
