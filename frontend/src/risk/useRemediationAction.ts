// frontend/src/risk/useRemediationAction.ts
// React hook — owns playbook execution state.
import { useCallback, useMemo, useState } from 'react';
import { generateRankedPlaybooks, summarisePlaybooks, type RemediationSummary } from './remediationEngine';
import type {
  ActionablePlaybook,
  CorrelatedAssetThreat,
  SystemRiskSummary,
} from './schema';

interface UseRemediationActionResult {
  playbooks: ActionablePlaybook[];
  summary: RemediationSummary;
  /** Simulate one playbook → marks it APPLIED and returns ΔEAL */
  executeSimulatedFix: (playbookId: string) => number;
  /** Roll back all applied fixes */
  resetAll: () => void;
}

export function useRemediationAction(
  threats: CorrelatedAssetThreat[],
  systemState: SystemRiskSummary
): UseRemediationActionResult {
  // Generate once from the current threat set; PP3/PP4 changes should
  // re-render the parent so this recomputes.
  const basePlaybooks = useMemo(
    () => generateRankedPlaybooks(threats, systemState),
    [threats, systemState]
  );

  // Track execution status per playbook id, independent of the base list
  const [applied, setApplied] = useState<Set<string>>(() => new Set());

  const playbooks = useMemo(
    () =>
      basePlaybooks.map((pb) =>
        applied.has(pb.id)
          ? { ...pb, executionStatus: 'APPLIED' as const }
          : pb
      ),
    [basePlaybooks, applied]
  );

  const summary = useMemo(() => summarisePlaybooks(playbooks), [playbooks]);

  const executeSimulatedFix = useCallback(
    (playbookId: string): number => {
      const target = basePlaybooks.find((pb) => pb.id === playbookId);
      if (!target || applied.has(playbookId)) return 0;
      setApplied((prev) => {
        const next = new Set(prev);
        next.add(playbookId);
        return next;
      });
      return target.potentialEalReduction;
    },
    [basePlaybooks, applied]
  );

  const resetAll = useCallback(() => setApplied(new Set()), []);

  return { playbooks, summary, executeSimulatedFix, resetAll };
}