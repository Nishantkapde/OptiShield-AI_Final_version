// frontend/src/risk/budgetOptimizer.ts
// Pure-TypeScript 0-1 Knapsack optimizer + Efficient Frontier generator.
// No backend, no WASM. Runs entirely in the browser.
import {
  EfficientFrontierPoint,
  OptimizationInput,
  OptimizationResult,
  SecurityControl,
  THREAT_MULTIPLIERS,
} from './schema';

// ============================================================
// DP cost granularity.
//
// Knapsack DP is O(n × capacity). To keep capacity bounded we
// discretize cost into "slots". A control costing $47,000 with a
// $10,000 slot size occupies ceil(47,000 / 10,000) = 5 slots
// ($50,000 of capacity). This is conservative: we never exceed
// the real budget, we may under-spend by up to (slot - 1).
//
// Slot size scales with budget so capacity stays ≤ ~1,000.
// ============================================================
function chooseCostUnit(totalBudget: number): number {
  if (totalBudget <= 100_000) return 1_000;         // $1K  granularity
  if (totalBudget <= 1_000_000) return 10_000;      // $10K
  if (totalBudget <= 10_000_000) return 50_000;     // $50K
  return 100_000;                                    // $100K
}

// ============================================================
// Internal 0-1 Knapsack core (DP matrix).
//
//   dp[i][w] = maximum total ΔEAL achievable using the first i
//              controls with at most `w` capacity slots.
//
// Recurrence:
//   dp[i][w] = dp[i-1][w]                                     (skip item i)
//   dp[i][w] = max(dp[i][w], dp[i-1][w - weight[i]] + value[i]) (take item i, if it fits)
//
// After the matrix is filled, we walk backwards from dp[n][capacity]
// to reconstruct which controls were selected.
// ============================================================
interface KnapsackResult {
  maxValue: number;
  selectedIndices: number[];
  totalCost: number;
}

function runKnapsack(
  controls: SecurityControl[],
  budget: number,
  threatMultiplier: number
): KnapsackResult {
  const n = controls.length;
  if (n === 0 || budget <= 0) {
    return { maxValue: 0, selectedIndices: [], totalCost: 0 };
  }

  const unit = chooseCostUnit(budget);
  const capacity = Math.max(1, Math.floor(budget / unit));

  // Item weights (slots) — ceil so we never over-commit the budget.
  const weights = controls.map((c) => Math.max(1, Math.ceil(c.cost / unit)));
  // Item values — ΔEAL scaled by the current threat multiplier.
  const values = controls.map((c) => c.riskReductionEal * threatMultiplier);

  // DP matrix: (n + 1) rows × (capacity + 1) columns.
  // Row 0 is the "no items considered" baseline (all zeros).
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(capacity + 1).fill(0)
  );

  for (let i = 1; i <= n; i++) {
    const wi = weights[i - 1];
    const vi = values[i - 1];
    const prev = dp[i - 1];
    const curr = dp[i];
    for (let w = 0; w <= capacity; w++) {
      // Skip item i
      curr[w] = prev[w];
      // Take item i (if it fits)
      if (wi <= w) {
        const candidate = prev[w - wi] + vi;
        if (candidate > curr[w]) curr[w] = candidate;
      }
    }
  }

  // Reconstruct selection by walking the matrix backwards.
  const selectedIndices: number[] = [];
  let w = capacity;
  for (let i = n; i >= 1; i--) {
    if (dp[i][w] !== dp[i - 1][w]) {
      selectedIndices.push(i - 1);
      w -= weights[i - 1];
    }
  }
  selectedIndices.reverse();

  const totalCost = selectedIndices.reduce((sum, idx) => sum + controls[idx].cost, 0);

  return {
    maxValue: dp[n][capacity],
    selectedIndices,
    totalCost,
  };
}

// ============================================================
// ROSI — Return on Security Investment
//
//   ROSI = ((Total Risk Reduction - Total Cost) / Total Cost) × 100
//
// Expressed as a percentage. Returns 0 when nothing is selected.
// ============================================================
function computeRosi(totalRiskReduction: number, totalCost: number): number {
  if (totalCost <= 0) return 0;
  return ((totalRiskReduction - totalCost) / totalCost) * 100;
}

// ============================================================
// Main entry point — optimizes the budget allocation.
//
// Steps:
//   1. Resolve the threat multiplier from the alert level.
//   2. Cap the effective budget at the sum of all controls' costs
//      (no point considering more budget than the portfolio can absorb).
//   3. Run 0-1 Knapsack to find the optimal subset.
//   4. Compute total cost, total ΔEAL, and ROSI for that subset.
//   5. Generate the 10-point Efficient Frontier for charting.
// ============================================================
export function optimizeSecurityBudget(input: OptimizationInput): OptimizationResult {
  const { controls, budget, threatAlertLevel } = input;
  const multiplier = THREAT_MULTIPLIERS[threatAlertLevel];

  const totalAvailableCost = controls.reduce((sum, c) => sum + c.cost, 0);
  const effectiveBudget = Math.min(budget, totalAvailableCost);

  const knapsack = runKnapsack(controls, effectiveBudget, multiplier);
  const recommendedControls = knapsack.selectedIndices.map((i) => controls[i]);

  const totalCost = recommendedControls.reduce((sum, c) => sum + c.cost, 0);
  const totalRiskReduction = recommendedControls.reduce(
    (sum, c) => sum + c.riskReductionEal * multiplier,
    0
  );
  const overallRosi = computeRosi(totalRiskReduction, totalCost);

  const efficientFrontierPoints = generateEfficientFrontier(
    controls,
    totalAvailableCost,
    multiplier
  );

  return {
    recommendedControls,
    totalCost,
    totalRiskReduction,
    overallRosi,
    efficientFrontierPoints,
  };
}

// ============================================================
// Efficient Frontier — 10 budget steps from 10% to 100%
// of the maximum possible spend.
//
// At each step we run a fresh knapsack to find the maximum
// achievable ΔEAL. This traces the outer envelope of what's
// achievable at each cost level — the "efficient frontier".
// ============================================================
export function generateEfficientFrontier(
  controls: SecurityControl[],
  maxBudget: number,
  threatMultiplier: number
): EfficientFrontierPoint[] {
  const STEPS = 10;
  const points: EfficientFrontierPoint[] = [];

  for (let i = 1; i <= STEPS; i++) {
    const stepBudget = (maxBudget * i) / STEPS;
    const knapsack = runKnapsack(controls, stepBudget, threatMultiplier);

    const stepCost = knapsack.selectedIndices.reduce(
      (sum, idx) => sum + controls[idx].cost,
      0
    );
    const stepReduction = knapsack.selectedIndices.reduce(
      (sum, idx) => sum + controls[idx].riskReductionEal * threatMultiplier,
      0
    );

    points.push({
      budgetStep: stepBudget,
      maxRiskReduction: stepReduction,
      rosi: computeRosi(stepReduction, stepCost),
    });
  }

  return points;
}