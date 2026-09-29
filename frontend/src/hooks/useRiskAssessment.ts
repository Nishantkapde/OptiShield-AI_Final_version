// frontend/src/hooks/useRiskAssessment.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  assessAssetRisk,
  AssetRiskInput,
  RiskAssessmentResult,
} from '../lib/api/riskClient';

interface UseRiskAssessmentState {
  result: RiskAssessmentResult | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useRiskAssessment(
  input: AssetRiskInput | null
): UseRiskAssessmentState {
  const [result, setResult] = useState<RiskAssessmentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async () => {
    if (!input) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const res = await assessAssetRisk(input, controller.signal);
      setResult(res);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError(e as Error);
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }, [input]);

  useEffect(() => {
    run();
    return () => abortRef.current?.abort();
  }, [run]);

  return { result, loading, error, refresh: run };
}