import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { cn } from '@trip-flow/ui/lib/cn';

const INVITE_ALPHABET = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]$/;

interface OtpInputProps {
  /** Number of slots in the code. */
  length: number;
  /** Controlled value — caller stores the joined string. */
  value: string;
  onChange: (next: string) => void;
  /** Fires when every slot is filled. */
  onComplete?: (code: string) => void;
  /** Auto-focus the first slot on mount. */
  autoFocus?: boolean;
  disabled?: boolean;
}

/**
 * Accessible 8-slot input that behaves like Apple's auth code field:
 * type to advance, Backspace to retreat, arrows to jump, paste fills.
 *
 * Coerces input to the invite alphabet (no 0/O/1/I/L). Anything outside
 * that set is silently dropped — typing "o" simply does nothing, which
 * is friendlier than throwing a validation error after submit.
 */
export function OtpInput({
  length,
  value,
  onChange,
  onComplete,
  autoFocus,
  disabled,
}: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const chars = Array.from({ length }, (_, i) => value[i] ?? '');

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (value.length === length) onComplete?.(value);
    // onComplete is intentionally not in deps: callers redefine it each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, length]);

  function setCharAt(index: number, char: string) {
    const next = (value.slice(0, index) + char + value.slice(index + 1)).slice(0, length);
    onChange(next);
  }

  function handleChange(index: number, raw: string) {
    const char = raw.slice(-1).toUpperCase();
    if (!char) {
      setCharAt(index, '');
      return;
    }
    if (!INVITE_ALPHABET.test(char)) return;
    setCharAt(index, char);
    if (index < length - 1) refs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !chars[index] && index > 0) {
      refs.current[index - 1]?.focus();
      setCharAt(index - 1, '');
      e.preventDefault();
      return;
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      refs.current[index - 1]?.focus();
      e.preventDefault();
    }
    if (e.key === 'ArrowRight' && index < length - 1) {
      refs.current[index + 1]?.focus();
      e.preventDefault();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData
      .getData('text')
      .toUpperCase()
      .split('')
      .filter((c) => INVITE_ALPHABET.test(c))
      .join('')
      .slice(0, length);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    refs.current[Math.min(pasted.length, length - 1)]?.focus();
  }

  return (
    <div className="flex justify-between gap-2" role="group" aria-label="Invite code">
      {chars.map((char, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="one-time-code"
          maxLength={1}
          value={char}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          aria-label={`Character ${i + 1} of ${length}`}
          className={cn(
            'bg-muted text-foreground placeholder:text-muted-foreground/40 focus-visible:border-primary aspect-square w-full max-w-12 rounded-xl border-2 border-transparent text-center font-mono text-lg font-semibold transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
            char && 'bg-card border-border',
          )}
        />
      ))}
    </div>
  );
}
