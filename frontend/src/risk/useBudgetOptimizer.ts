// frontend/src/risk/useBudgetOptimizer.ts
// React hook wrapper — memoized so slider drags recalculate in <2ms.
import { useMemo } from 'react';
import { optimizeSecurityBudget } from './budgetOptimizer';
import type {
  OptimizationResult,
  SecurityControl,
  ThreatAlertLevel,
} from './schema';

/**
 * Runs the 0-1 Knapsack optimizer and rebuilds the Efficient Frontier
 * whenever controls, budget, or threatLevel change.
 *
 * The whole result is memoized on the three inputs — a budget slider
 * drag only triggers a fresh computation if the budget value actually
 * changed (React bails out on same-value setState).
 */
export function useBudgetOptimizer(
  controls: SecurityControl[],
  budget: number,
  threatLevel: ThreatAlertLevel
): OptimizationResult {
  return useMemo(
    () =>
      optimizeSecurityBudget({
        controls,
        budget,
        threatAlertLevel: threatLevel,
      }),
    [controls, budget, threatLevel]
  );
}