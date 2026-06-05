import { cn } from '@/lib/cn';

interface AvatarProps {
  /** Display name — its first character is the fallback initial. */
  name: string;
  /** Image URL; when absent (or it fails to load) the initial circle is shown. */
  src?: string | null;
  /** Tailwind size classes for both the image and the fallback circle. */
  size?: string;
  /** Extra classes applied to whichever element renders (image or fallback). */
  className?: string;
  /** Extra classes applied to the fallback circle only (e.g. a custom color). */
  fallbackClassName?: string;
}

/**
 * Renders a member's avatar image, falling back to a primary-tinted circle
 * with the name's first initial. Used across the finances views so the
 * image/fallback pattern lives in one place.
 */
export function Avatar({ name, src, size = 'w-9 h-9', className, fallbackClassName }: AvatarProps) {
  if (src) {
    return (
      <img src={src} alt={name} className={cn(size, 'rounded-full object-cover', className)} />
    );
  }

  return (
    <div
      className={cn(
        size,
        'rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0',
        className,
        fallbackClassName,
      )}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
