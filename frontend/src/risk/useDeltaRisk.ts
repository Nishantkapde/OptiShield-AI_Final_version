// frontend/src/risk/useDeltaRisk.ts
// React integration for the delta engine.
// Owns the SystemRiskSummary state + a bounded event log.
import { useCallback, useRef, useState } from 'react';
import { deltaEngine } from './deltaEngine';
import type {
  AssetRiskInput,
  SystemRiskSummary,
  TelemetryEvent,
} from './schema';

export interface EventLogEntry {
  event: TelemetryEvent;
  deltaEal: number;
  deltaDirectLoss: number;
  durationMs: number;
  /** System total EAL AFTER this event was applied */
  systemEalAfter: number;
}

interface UseDeltaRiskState {
  summary: SystemRiskSummary;
  eventLog: EventLogEntry[];
  /** Dispatch one telemetry event → engine recalculates in O(1) */
  dispatchTelemetryEvent: (event: TelemetryEvent) => void;
  /** Reset the engine with a fresh portfolio */
  reset: (assets: AssetRiskInput[]) => void;
}

const EVENT_LOG_LIMIT = 20;

export function useDeltaRisk(
  initialAssets: AssetRiskInput[]
): UseDeltaRiskState {
  // Lazy init — runs the O(N) seed exactly once
  const [summary, setSummary] = useState<SystemRiskSummary>(() =>
    deltaEngine.initialize(initialAssets)
  );
  const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);

  // Sequence counter for synthetic event IDs
  const seqRef = useRef(0);

  const dispatchTelemetryEvent = useCallback((event: TelemetryEvent) => {
    setSummary((prevSummary) => {
      const result = deltaEngine.processTelemetryEvent(event, prevSummary);

      // Push to the log — bounded, no unbounded growth
      const entry: EventLogEntry = {
        event,
        deltaEal: result.deltaEal,
        deltaDirectLoss: result.deltaDirectLoss,
        durationMs: result.durationMs,
        systemEalAfter: result.summary.totalEal,
      };
      setEventLog((log) => [entry, ...log].slice(0, EVENT_LOG_LIMIT));

      return result.summary;
    });
  }, []);

  const reset = useCallback((assets: AssetRiskInput[]) => {
    setSummary(deltaEngine.initialize(assets));
    setEventLog([]);
    seqRef.current = 0;
  }, []);

  return { summary, eventLog, dispatchTelemetryEvent, reset };
}