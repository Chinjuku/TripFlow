import { Compass } from 'lucide-react';
import { cn } from '@/lib/cn';

const SPIN_DURATION_S = 8;
const START_MS = Date.now();

interface SpinningCompassProps {
  className?: string;
  size?: number;
  strokeWidth?: number;
}

export function SpinningCompass({ className, size = 5, strokeWidth = 2 }: SpinningCompassProps) {
  const elapsed = (Date.now() - START_MS) / 1000;
  const delay = -(elapsed % SPIN_DURATION_S);

  return (
    <Compass
      className={cn(`h-${size} w-${size}`, className)}
      strokeWidth={strokeWidth}
      style={{
        animation: `spin ${SPIN_DURATION_S}s linear infinite`,
        animationDelay: `${delay}s`,
      }}
    />
  );
}
