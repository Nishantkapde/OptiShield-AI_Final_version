// backend/src/services/risk/listAssets.ts
// Runs Pain Point 1 on every asset in the store and aggregates results.
// Purely functional — `now` is injectable for deterministic tests.
import { assessAssetRisk } from './assessAssetRisk';
import { getAllAssets } from './assets.store';
import type { RiskAssessmentResult } from './schema';

export interface AssetWithAssessment {
  // Metadata (from store)
  assetId: string;
  name: string;
  type: string;
  source: string;
  eventsPerSec: number;
  coverage: number;
  lastEvent: string;
  // Derived display status
  status: 'healthy' | 'degraded' | 'down' | 'maintenance';
  // Full Pain Point 1 output
  assessment: RiskAssessmentResult;
}

export interface AssetListTotals {
  count: number;
  inMaintenance: number;
  /** Sum of annualizedLossExpectancyEal across non-maintenance assets (USD) */
  totalEalUsd: number;
  /** Sum of directLoss across non-maintenance assets (USD) */
  totalDirectLossUsd: number;
  /** Sum of plannedOperationalCost across maintenance assets (USD) */
  totalPlannedOperationalCostUsd: number;
  /** Count of assets whose alerts are suppressed */
  suppressedAlertCount: number;
}

export interface AssetListResult {
  assets: AssetWithAssessment[];
  totals: AssetListTotals;
  generatedAt: string;
}

/** Derive a display status from the assessment + raw telemetry signals */
function deriveStatus(
  eventsPerSec: number,
  coverage: number,
  assessment: RiskAssessmentResult
): AssetWithAssessment['status'] {
  if (assessment.isMaintenanceActive) return 'maintenance';
  if (eventsPerSec === 0) return 'down';
  if (coverage < 80) return 'degraded';
  return 'healthy';
}

export function listAssets(now: Date = new Date()): AssetListResult {
  const stored = getAllAssets();

  const assets: AssetWithAssessment[] = stored.map((a) => {
    const assessment = assessAssetRisk(
      { assetId: a.assetId, ...a.riskInput },
      now
    );
    return {
      assetId: a.assetId,
      name: a.name,
      type: a.type,
      source: a.source,
      eventsPerSec: a.eventsPerSec,
      coverage: a.coverage,
      lastEvent: a.lastEvent,
      status: deriveStatus(a.eventsPerSec, a.coverage, assessment),
      assessment,
    };
  });

  // Single pass aggregation
  let inMaintenance = 0;
  let totalEalUsd = 0;
  let totalDirectLossUsd = 0;
  let totalPlannedOperationalCostUsd = 0;
  let suppressedAlertCount = 0;

  for (const a of assets) {
    if (a.assessment.isMaintenanceActive) {
      inMaintenance++;
      totalPlannedOperationalCostUsd += a.assessment.plannedOperationalCost;
    } else {
      totalEalUsd += a.assessment.annualizedLossExpectancyEal;
      totalDirectLossUsd += a.assessment.directLoss;
    }
    if (a.assessment.suppressAlerts) suppressedAlertCount++;
  }

  return {
    assets,
    totals: {
      count: assets.length,
      inMaintenance,
      totalEalUsd: Math.round(totalEalUsd),
      totalDirectLossUsd: Math.round(totalDirectLossUsd),
      totalPlannedOperationalCostUsd: Math.round(totalPlannedOperationalCostUsd),
      suppressedAlertCount,
    },
    generatedAt: now.toISOString(),
  };
}