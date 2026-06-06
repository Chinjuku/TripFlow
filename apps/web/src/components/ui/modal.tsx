import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Accessible label for the dialog. Required for screen readers.
   * When `hideHeader` is true, the title is rendered visually-hidden but
   * still announced - use this when the dialog body has its own header.
   */
  title: string;
  description?: string;
  /** Hide the rendered header chrome (close button, title, description). */
  hideHeader?: boolean;
  /**
   * When false, backdrop clicks and ESC don't close the dialog - only an
   * explicit close control (e.g. an X button) can. Defaults to true.
   * Use for forms where an accidental outside-click would lose input, or when
   * the dialog hosts portalled popovers whose clicks can look like backdrop hits.
   */
  dismissable?: boolean;
  children: ReactNode;
  /**
   * Optional pinned footer rendered below the scrollable body - stays visible
   * without scrolling (e.g. a primary action). Sits inside the dialog's safe
   * area on mobile.
   */
  footer?: ReactNode;
  className?: string;
}

/**
 * Thin wrapper around the native <dialog> element so we get free focus
 * trapping, ESC-to-close, and inert backdrop without pulling in Radix.
 *
 * Responsive: bottom sheet on mobile (anchored to the viewport bottom
 * with a drag handle), centered card on `sm:` and up. The two layouts
 * share the same underlying <dialog> - we just shift the margin/radius
 * to switch between them.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  hideHeader,
  dismissable = true,
  children,
  footer,
  className,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const touchStartRef = useRef<{ y: number; time: number } | null>(null);
  const currentDeltaRef = useRef<number>(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open) {
      if (!node.open) {
        node.showModal();
        node.style.transform = '';
      }
    } else {
      if (node.open) node.close();
    }
  }, [open]);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (!touch || !ref.current) return;
    touchStartRef.current = { y: touch.clientY, time: Date.now() };
    currentDeltaRef.current = 0;
    ref.current.classList.add('is-dragging');
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current || !ref.current) return;
    const touch = e.touches[0];
    if (!touch) return;
    const deltaY = touch.clientY - touchStartRef.current.y;

    if (deltaY > 0) {
      currentDeltaRef.current = deltaY;
      ref.current.style.transform = `translateY(${deltaY}px)`;
    } else {
      currentDeltaRef.current = 0;
      ref.current.style.transform = '';
    }
  };

  const handleTouchEnd = () => {
    if (!touchStartRef.current || !ref.current) return;

    const deltaY = currentDeltaRef.current;
    const dragDuration = Date.now() - touchStartRef.current.time;
    const velocity = deltaY / dragDuration;

    const node = ref.current;
    touchStartRef.current = null;
    currentDeltaRef.current = 0;

    // Remove the dragging class so CSS transitions resume
    node.classList.remove('is-dragging');

    if (deltaY > 120 || (velocity > 0.5 && deltaY > 30)) {
      node.style.transform = 'translateY(100%)';
      setTimeout(() => {
        onOpenChange(false);
        node.style.transform = '';
      }, 200);
    } else {
      node.style.transform = '';
    }
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      onClose={() => onOpenChange(false)}
      // The native <dialog> fires `cancel` on ESC; block it when not dismissable.
      onCancel={(e) => {
        if (!dismissable) e.preventDefault();
      }}
      onClick={(e) => {
        if (dismissable && e.target === ref.current) onOpenChange(false);
      }}
      // `tf-modal` owns the open/close transition (CSS @starting-style +
      // transition-behavior:allow-discrete - see styles.css). The native
      // <dialog> animates both in and out without any JS timing.
      className={cn(
        'tf-modal',
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
        className,
      )}
    >
      <div className="flex max-h-[85dvh] flex-col sm:max-h-[calc(100dvh-3rem)]">
        {/* Drag handle - visual affordance for mobile bottom sheet, hidden on desktop. */}
        <div
          className="flex justify-center pt-2 pb-3 cursor-grab active:cursor-grabbing sm:hidden select-none touch-none"
          aria-hidden
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <span className="bg-muted-foreground/30 h-1.5 w-12 rounded-full" />
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
            'min-h-0 flex-1 overflow-y-auto',
            // Slim, rounded, low-contrast scrollbar that brightens on hover -
            // avoids the chunky default track fighting the modal's soft surface.
            '[scrollbar-width:thin] [scrollbar-color:theme(colors.border)_transparent]',
            '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent',
            '[&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full',
            '[&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/40',
            hideHeader
              ? ''
              : footer
                ? 'px-5 pt-4 sm:px-6'
                : 'px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-6',
          )}
        >
          {children}
        </div>
        {footer && (
          // Pinned action area - outside the scroll body so it stays visible.
          <div className="border-border bg-card shrink-0 border-t px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-4">
            {footer}
          </div>
        )}
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
