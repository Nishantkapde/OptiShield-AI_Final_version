// frontend/src/risk/useMonteCarlo.ts
// React hook — memoizes the simulation on all distribution params.
import { useMemo } from 'react';
import { runMonteCarloSimulation } from './monteCarloEngine';
import {
  DEFAULT_MONTE_CARLO_ITERATIONS,
  type DistributionParams,
  type VaRMetrics,
} from './schema';

/**
 * Runs the Monte Carlo simulation inside useMemo.
 *
 * Decomposition: the four useMemo dependencies are primitives (numbers),
 * so dragging a slider that emits the same number twice does NOT
 * trigger a re-simulation. This keeps slider drags smooth.
 */
export function useMonteCarlo(
  assetId: string,
  lossDistribution: DistributionParams,
  frequencyDistribution: DistributionParams,
  iterations: number = DEFAULT_MONTE_CARLO_ITERATIONS
): VaRMetrics {
  return useMemo(
    () =>
      runMonteCarloSimulation({
        assetId,
        lossDistribution,
        frequencyDistribution,
        iterations,
      }),
    // Primitive deps — safe to list individually.
    [
      assetId,
      lossDistribution.min,
      lossDistribution.mostLikely,
      lossDistribution.max,
      frequencyDistribution.min,
      frequencyDistribution.mostLikely,
      frequencyDistribution.max,
      iterations,
    ]
  );
}