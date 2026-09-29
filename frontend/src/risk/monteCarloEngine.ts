// frontend/src/risk/monteCarloEngine.ts
// Client-side Monte Carlo / Value-at-Risk engine.
//
// ── Why Monte Carlo? ────────────────────────────────────────
// A single EAL number is an average. It tells you nothing about
// the tail. Monte Carlo runs N probabilistic scenarios and
// returns the DISTRIBUTION of annual losses — which lets us say
// things like "there is a 5% chance annual loss exceeds $320K."
//
// ── PERT distribution ───────────────────────────────────────
// PERT is a smooth, bounded distribution defined by (min, mode, max).
// It's the standard for risk modelling because it captures
// "expert opinion" — an analyst can say "the loss is probably $60K,
// worst case $450K, best case $15K."
//
//   λ  = 4
//   α  = 1 + λ × (mode − min) / (max − min)
//   β  = 1 + λ × (max − mode) / (max − min)
//   x  = min + Beta(α, β) × (max − min)
//
// Mean = (min + 4×mode + max) / 6
//
// ── Beta sampling ───────────────────────────────────────────
// Beta(α, β) = G(α) / (G(α) + G(β))   where G is a Gamma sample.
// Gamma is sampled via Marsaglia-Tsang.
import {
  DEFAULT_MONTE_CARLO_ITERATIONS,
  LEC_STEPS,
  type DistributionParams,
  type LossExceedancePoint,
  type MonteCarloInput,
  type VaRMetrics,
} from './schema';

// ============================================================
// Random primitives
// ============================================================

/** Standard normal via Box-Muller. */
function sampleNormal(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Gamma(shape, scale=1) sample — Marsaglia & Tsang (2000).
 * Rejection sampling: acceptance rate > 95% for shape ≥ 1.
 */
function sampleGamma(shape: number): number {
  if (shape < 1) {
    // Boost: G(shape) = G(1 + shape) × U^(1/shape)
    const u = Math.random();
    return sampleGamma(1 + shape) * Math.pow(u, 1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  for (;;) {
    let x: number;
    let v: number;
    do {
      x = sampleNormal();
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = Math.random();

    // Fast path
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    // Log-space acceptance
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

/** Beta(α, β) via two Gamma samples. */
function sampleBeta(alpha: number, beta: number): number {
  const g1 = sampleGamma(alpha);
  const g2 = sampleGamma(beta);
  const sum = g1 + g2;
  return sum > 0 ? g1 / sum : 0.5;
}

// ============================================================
// PERT sampling
// ============================================================

/**
 * Draw one sample from a PERT(min, mode, max) distribution.
 * Returns `min` if the range is degenerate.
 */
export function samplePert(params: DistributionParams): number {
  const { min, mostLikely, max } = params;
  const range = max - min;
  if (range <= 0) return min;

  const LAMBDA = 4;
  // Clamp mode into [min, max] to guard against bad inputs.
  const mode = Math.min(Math.max(mostLikely, min), max);
  const alpha = 1 + (LAMBDA * (mode - min)) / range;
  const beta = 1 + (LAMBDA * (max - mode)) / range;

  const b = sampleBeta(alpha, beta);
  return min + b * range;
}

/** Analytic mean of a PERT distribution. */
export function pertMean(params: DistributionParams): number {
  return (params.min + 4 * params.mostLikely + params.max) / 6;
}

// ============================================================
// Percentile helper
// ============================================================
function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(
    sortedAsc.length - 1,
    Math.max(0, Math.floor(p * sortedAsc.length))
  );
  return sortedAsc[idx];
}

// ============================================================
// Loss Exceedance Curve generator
// ============================================================
function buildLossExceedanceCurve(
  sortedLosses: number[]
): LossExceedancePoint[] {
  const n = sortedLosses.length;
  const points: LossExceedancePoint[] = [];

  for (let i = 0; i <= LEC_STEPS; i++) {
    const idx = Math.min(n - 1, Math.floor((i / LEC_STEPS) * (n - 1)));
    const lossThreshold = sortedLosses[idx];
    // Probability that loss EXCEEDS this threshold
    const probabilityExceeded = Math.max(0, 1 - (idx + 1) / n);
    points.push({ lossThreshold, probabilityExceeded });
  }

  return points;
}

// ============================================================
// Deterministic EAL (used for chart comparison)
// ============================================================
export function computeDeterministicEal(
  lossDistribution: DistributionParams,
  frequencyDistribution: DistributionParams
): number {
  return Math.round(pertMean(lossDistribution) * pertMean(frequencyDistribution));
}

// ============================================================
// Main simulation
// ============================================================

/**
 * Run a Monte Carlo simulation and produce VaR metrics.
 *
 * Per iteration:
 *   1. Sample annual frequency N ~ PERT(freqParams)
 *   2. For each of N events, sample loss ~ PERT(lossParams)
 *   3. totalAnnualLoss = Σ event losses
 *
 * Complexity: O(iterations × avgFrequency)
 * Sort:       O(iterations × log(iterations))
 * LEC:        O(LEC_STEPS)
 *
 * Typical runtime on a 2023 laptop: 5–10 ms at 10,000 iterations.
 */
export function runMonteCarloSimulation(input: MonteCarloInput): VaRMetrics {
  const start = performance.now();

  const iterations = input.iterations ?? DEFAULT_MONTE_CARLO_ITERATIONS;
  const losses = new Array<number>(iterations);

  for (let i = 0; i < iterations; i++) {
    // Step 1 — event count for this year
    const freqRaw = samplePert(input.frequencyDistribution);
    const frequency = Math.max(0, Math.round(freqRaw));

    // Step 2 — sum of losses for each event
    let totalLoss = 0;
    for (let j = 0; j < frequency; j++) {
      totalLoss += samplePert(input.lossDistribution);
    }
    losses[i] = totalLoss;
  }

  // Step 3 — sort ascending for percentile extraction
  losses.sort((a, b) => a - b);

  // Step 4 — summary statistics
  const mean =
    losses.reduce((sum, v) => sum + v, 0) / iterations;

  const medianLoss = percentile(losses, 0.5);
  const var90 = percentile(losses, 0.9);
  const var95 = percentile(losses, 0.95);
  const var99 = percentile(losses, 0.99);
  const maxProbableLoss = losses[iterations - 1];

  // Step 5 — Loss Exceedance Curve
  const lossExceedanceCurve = buildLossExceedanceCurve(losses);

  const processingTimeMs = performance.now() - start;

  return {
    meanEal: Math.round(mean),
    medianLoss: Math.round(medianLoss),
    var90: Math.round(var90),
    var95: Math.round(var95),
    var99: Math.round(var99),
    maxProbableLoss: Math.round(maxProbableLoss),
    lossExceedanceCurve,
    processingTimeMs,
    iterations,
  };
}