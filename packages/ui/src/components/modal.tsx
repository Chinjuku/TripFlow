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
 *
 * Responsive: bottom sheet on mobile (anchored to the viewport bottom
 * with a drag handle), centered card on `sm:` and up. The two layouts
 * share the same underlying <dialog> — we just shift the margin/radius
 * to switch between them.
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
        'bg-card text-card-foreground p-0 shadow-xl backdrop:bg-black/50 backdrop:backdrop-blur-sm border-none outline-none',
        // Mobile bottom sheet: the native <dialog> UA stylesheet sets
        // `position:fixed; top:0; bottom:0; max-height:calc(100%-6px-2em); margin:auto`.
        // We must use !important to override these high-specificity UA rules
        // so the sheet sits flush at the viewport bottom.
        'max-sm:!fixed max-sm:!bottom-0 max-sm:!top-auto max-sm:!inset-x-0 max-sm:!m-0 max-sm:!max-h-[85dvh]',
        'max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none max-sm:rounded-t-2xl',
        'overflow-hidden',
        // Desktop centered card: restore centering + max width.
        'sm:my-auto sm:mx-auto sm:w-[calc(100vw-1.5rem)] sm:max-w-md sm:rounded-2xl sm:border sm:border-border sm:max-h-[calc(100dvh-3rem)]',
        'open:animate-in open:fade-in-0 open:slide-in-from-bottom-4 sm:open:slide-in-from-bottom-0 sm:open:zoom-in-95',
        className,
      )}
    >
      <div className="flex max-h-[85dvh] flex-col sm:max-h-[calc(100dvh-3rem)]">
        {/* Drag handle — visual affordance for mobile bottom sheet, hidden on desktop. */}
        <div className="flex justify-center pt-2 sm:hidden" aria-hidden>
          <span className="bg-muted-foreground/30 h-1 w-10 rounded-full" />
        </div>

        {hideHeader ? (
          <h2 id="modal-title" className="sr-only">
            {title}
          </h2>
        ) : (
          <div className="flex items-start justify-between gap-4 px-5 pt-4 sm:px-6 sm:pt-6">
            <div className="space-y-1">
              <h2
                id="modal-title"
                className="font-headline text-primary text-lg font-bold sm:text-xl"
              >
                {title}
              </h2>
              {description && <p className="text-muted-foreground text-sm">{description}</p>}
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="text-muted-foreground hover:text-foreground -mr-1.5 -mt-1.5 rounded-md p-2 sm:-mr-2 sm:-mt-2"
            >
              <CloseGlyph />
            </button>
          </div>
        )}
        <div
          className={cn(
            'overflow-y-auto',
            hideHeader
              ? ''
              : 'px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-6',
          )}
        >
          {children}
        </div>
      </div>
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
