// frontend/src/hooks/useAssets.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { AssetListResult, listAssets } from '../lib/api/riskClient';

/** How often to re-poll the backend (ms). */
const POLL_INTERVAL_MS = 30_000;

interface UseAssetsState {
  /** Latest successful response, or null before first fetch */
  data: AssetListResult | null;
  /** True while a fetch is in flight (initial OR polling) */
  loading: boolean;
  /** Non-null if the last fetch failed */
  error: Error | null;
  /** ISO timestamp of the last successful fetch */
  lastUpdated: string | null;
  /** Force an immediate fetch */
  refresh: () => void;
}

/**
 * Fetches GET /api/risk/assets on mount and re-polls every 30s.
 * Aborts in-flight requests on unmount or on overlapping fetches.
 */
export function useAssets(): UseAssetsState {
  const [data, setData] = useState<AssetListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const fetchOnce = useCallback(async () => {
    // Cancel any in-flight request before starting a new one.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const result = await listAssets(controller.signal);
      setData(result);
      setLastUpdated(result.generatedAt);
      setError(null);
    } catch (e) {
      // Abort is not an error — just ignore it.
      if ((e as Error).name !== 'AbortError') {
        setError(e as Error);
      }
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }, []);

  // Initial fetch + 30s polling
  useEffect(() => {
    fetchOnce();
    const id = setInterval(fetchOnce, POLL_INTERVAL_MS);
    return () => {
      clearInterval(id);
      abortRef.current?.abort();
    };
  }, [fetchOnce]);

  return { data, loading, error, lastUpdated, refresh: fetchOnce };
}