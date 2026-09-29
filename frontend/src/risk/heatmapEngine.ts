// frontend/src/risk/heatmapEngine.ts
// Buckets assets into a 5×5 likelihood × impact matrix.
//
// ── Bucketing math ──────────────────────────────────────────
// Likelihood score from LEF (log-ish scale):
//    LEF < 1   → 1  (very unlikely)
//    LEF < 3   → 2
//    LEF < 6   → 3
//    LEF < 12  → 4
//    LEF ≥ 12  → 5  (almost certain)
//
// Impact score from directLoss (USD):
//    < $100K     → 1
//    < $500K     → 2
//    < $1.5M     → 3
//    < $3M       → 4
//    ≥ $3M       → 5
//
// Tier from matrix score = likelihood × impact:
//    < 3   → VERY_LOW
//    < 6   → LOW
//    < 12  → MEDIUM
//    < 20  → HIGH
//    ≥ 20  → CRITICAL
import type {
  AssetRiskInput,
  HeatmapCell,
  HeatmapTier,
  RiskAssessmentResult,
} from './schema';

// ============================================================
// Score helpers
// ============================================================
function lefToScore(lef: number): 1 | 2 | 3 | 4 | 5 {
  if (!Number.isFinite(lef) || lef <= 0) return 1;
  if (lef < 1) return 1;
  if (lef < 3) return 2;
  if (lef < 6) return 3;
  if (lef < 12) return 4;
  return 5;
}

function directLossToScore(usd: number): 1 | 2 | 3 | 4 | 5 {
  if (!Number.isFinite(usd) || usd <= 0) return 1;
  if (usd < 100_000) return 1;
  if (usd < 500_000) return 2;
  if (usd < 1_500_000) return 3;
  if (usd < 3_000_000) return 4;
  return 5;
}

function tierFor(likelihood: number, impact: number): HeatmapTier {
  const score = likelihood * impact;
  if (score >= 20) return 'CRITICAL';
  if (score >= 12) return 'HIGH';
  if (score >= 6) return 'MEDIUM';
  if (score >= 3) return 'LOW';
  return 'VERY_LOW';
}

// ============================================================
// Empty grid factory — every cell exists, no sparse arrays
// ============================================================
function emptyGrid(): HeatmapCell[][] {
  const grid: HeatmapCell[][] = [];
  for (let likelihood = 1; likelihood <= 5; likelihood++) {
    const row: HeatmapCell[] = [];
    for (let impact = 1; impact <= 5; impact++) {
      row.push({
        likelihoodScore: likelihood,
        impactScore: impact,
        tier: tierFor(likelihood, impact),
        totalEal: 0,
        assetIds: [],
      });
    }
    grid.push(row);
  }
  return grid;
}

// ============================================================
// Main entry point
// ============================================================
export function generateRiskHeatmap(
  assets: AssetRiskInput[],
  results: Map<string, RiskAssessmentResult>
): HeatmapCell[][] {
  const grid = emptyGrid();

  for (const asset of assets) {
    const result = results.get(asset.assetId);
    if (!result) continue;

    const likelihood = lefToScore(result.lossEventFrequencyLef);
    const impact = directLossToScore(result.directLoss);

    // Grid is 1-indexed; internal arrays are 0-indexed.
    const cell = grid[likelihood - 1][impact - 1];
    cell.totalEal += result.annualizedLossExpectancyEal;
    cell.assetIds.push(asset.assetId);
  }

  // Round EAL after aggregation
  for (const row of grid) {
    for (const cell of row) {
      cell.totalEal = Math.round(cell.totalEal);
    }
  }

  return grid;
}

// ============================================================
// Derived helpers for the UI
// ============================================================
export interface HeatmapStats {
  totalEal: number;
  assetCount: number;
  hottestCell: HeatmapCell | null;
  criticalCellCount: number;
}

export function summariseHeatmap(grid: HeatmapCell[][]): HeatmapStats {
  let totalEal = 0;
  let assetCount = 0;
  let hottestCell: HeatmapCell | null = null;
  let criticalCellCount = 0;

  for (const row of grid) {
    for (const cell of row) {
      totalEal += cell.totalEal;
      assetCount += cell.assetIds.length;
      if (cell.tier === 'CRITICAL' && cell.assetIds.length > 0) criticalCellCount++;
      if (
        cell.assetIds.length > 0 &&
        (!hottestCell || cell.totalEal > hottestCell.totalEal)
      ) {
        hottestCell = cell;
      }
    }
  }

  return { totalEal, assetCount, hottestCell, criticalCellCount };
}