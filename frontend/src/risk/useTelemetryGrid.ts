// frontend/src/risk/useTelemetryGrid.ts
// React hook — manages the live signal stream + operational context.
import { useCallback, useMemo, useState } from 'react';
import {
  correlateAllAssets,
  computeNoiseReduction,
  type NoiseReductionMetric,
} from './telemetryCorrelator';
import type {
  CorrelatedAssetThreat,
  OperationalContext,
  TelemetrySignal,
} from './schema';

interface UseTelemetryGridState {
  signals: TelemetrySignal[];
  threats: CorrelatedAssetThreat[];
  context: OperationalContext;
  metrics: NoiseReductionMetric;
  /** Append a new signal (simulates live ingestion). */
  pushSignal: (signal: TelemetrySignal) => void;
  /** Toggle Black Friday / flash sale dampening. */
  toggleHighTrafficEvent: (on: boolean) => void;
  /** Toggle backup window dampening. */
  toggleBackupWindow: (on: boolean) => void;
  /** Reset context toggles only. */
  clearContext: () => void;
}

export function useTelemetryGrid(
  initialSignals: TelemetrySignal[],
  assetIds: string[]
): UseTelemetryGridState {
  const [signals, setSignals] = useState<TelemetrySignal[]>(initialSignals);
  const [context, setContext] = useState<OperationalContext>({});

  const threats = useMemo(
    () => correlateAllAssets(signals, assetIds, context),
    [signals, assetIds, context]
  );

  const metrics = useMemo(
    () => computeNoiseReduction(signals, threats),
    [signals, threats]
  );

  const pushSignal = useCallback((signal: TelemetrySignal) => {
    setSignals((prev) => [...prev, signal]);
  }, []);

  const toggleHighTrafficEvent = useCallback((on: boolean) => {
    setContext((prev) => ({
      ...prev,
      isHighTrafficEvent: on,
      description: on ? 'Black Friday / Flash Sale' : prev.description,
    }));
  }, []);

  const toggleBackupWindow = useCallback((on: boolean) => {
    setContext((prev) => ({
      ...prev,
      isBackupWindow: on,
      description: on ? 'Nightly Backup Window' : prev.description,
    }));
  }, []);

  const clearContext = useCallback(() => setContext({}), []);

  return {
    signals,
    threats,
    context,
    metrics,
    pushSignal,
    toggleHighTrafficEvent,
    toggleBackupWindow,
    clearContext,
  };
}