import { useCallback, useEffect, useRef, useState } from 'react';

export type ResourceStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ResourceState<T> {
  data: T | null;
  error: Error | null;
  status: ResourceStatus;
  isLoading: boolean;
  isReady: boolean;
  refresh: (silent?: boolean) => Promise<void>;
  mutate: (next: T | ((prev: T | null) => T)) => void;
}

export interface UseResourceOptions {
  /** Skip the initial fetch - useful when inputs aren't ready yet. */
  enabled?: boolean;
}

/**
 * Generic async resource hook.
 *
 * Wraps the common "fetch on mount, track loading/error, expose refresh"
 * pattern. Cancellation is handled by tagging each fetch with a request id;
 * stale responses are ignored rather than aborted, which keeps the fetcher
 * signature simple (no AbortSignal plumbing required).
 *
 * `deps` controls when the fetcher re-runs - pass the inputs the fetcher
 * closes over, exactly like useEffect.
 */
export function useResource<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  options: UseResourceOptions = {},
): ResourceState<T> {
  const { enabled = true } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<ResourceStatus>(enabled ? 'loading' : 'idle');

  // Each fetch increments this counter; only the latest response is applied.
  const requestIdRef = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(async (silent = false) => {
    const id = ++requestIdRef.current;
    if (!silent) setStatus('loading');
    setError(null);
    try {
      const result = await fetcherRef.current();
      if (requestIdRef.current !== id) return;
      setData(result);
      setStatus('success');
    } catch (err) {
      if (requestIdRef.current !== id) return;
      setError(err instanceof Error ? err : new Error(String(err)));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setStatus('idle');
      return;
    }
    void run();
    return () => {
      // Bump the id so any in-flight response is discarded.
      requestIdRef.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  const mutate = useCallback((next: T | ((prev: T | null) => T)) => {
    setData((prev) => (typeof next === 'function' ? (next as (p: T | null) => T)(prev) : next));
  }, []);

  return {
    data,
    error,
    status,
    isLoading: status === 'loading',
    isReady: status === 'success',
    refresh: run,
    mutate,
  };
}
