// frontend/src/lib/api/riskClient.ts
// Typed client for Pain Point 1 — Deterministic Quantitative Risk Engine.

// ============================================================
// Single-asset assessment (existing)
// ============================================================

export interface AssetRiskInput {
  assetId: string;
  downtimeHours: number;
  hourlyRevenueLoss: number;
  recordsExposed: number;
  costPerRecord: number;
  epssScore: number;                    // 0..1
  assetExposureMultiplier: number;
  annualThreatAttempts: number;
  // Maintenance Mode Suppressor fields (all optional)
  isInMaintenance?: boolean;
  maintenanceStart?: string;            // ISO 8601
  maintenanceEnd?: string;              // ISO 8601
  changeTicketId?: string;
}

export type RiskStatus = 'SCHEDULED_MAINTENANCE' | 'UNPLANNED_CYBER_RISK';

export interface RiskAssessmentResult {
  // Pain Point 1 outputs
  directLoss: number;
  lossEventFrequencyLef: number;
  annualizedLossExpectancyEal: number;
  // Maintenance Mode Suppressor outputs
  status: RiskStatus;
  isMaintenanceActive: boolean;
  suppressAlerts: boolean;
  plannedOperationalCost: number;
  auditMessage: string;
  assessedAt: string;
  changeTicketId?: string;
}

interface AssessEnvelope {
  ok: boolean;
  data: RiskAssessmentResult;
}

/**
 * POST /api/risk/assess
 * Server supports `?now=<ISO>` query param for deterministic testing.
 */
export async function assessAssetRisk(
  input: AssetRiskInput,
  signal?: AbortSignal
): Promise<RiskAssessmentResult> {
  const res = await fetch('/api/risk/assess', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal,
  });
  if (!res.ok) {
    throw new Error(`Risk assessment failed: ${res.status}`);
  }
  const payload = (await res.json()) as AssessEnvelope;
  return payload.data;
}

// ============================================================
// [NEW] Asset list — mirrors backend listAssets.ts shape
// ============================================================

export type AssetFeedType = 'SIEM' | 'EDR' | 'IAM' | 'Cloud' | 'Network' | 'DB';
export type AssetDisplayStatus = 'healthy' | 'degraded' | 'down' | 'maintenance';

export interface AssetWithAssessment {
  assetId: string;
  name: string;
  type: AssetFeedType;
  source: string;
  eventsPerSec: number;
  coverage: number;
  lastEvent: string;
  status: AssetDisplayStatus;
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

interface ListEnvelope {
  ok: boolean;
  data: AssetListResult;
}

/**
 * GET /api/risk/assets
 * Optional `signal` for AbortController support (used by useAssets hook).
 * Server supports `?now=<ISO>` for deterministic testing if needed later.
 */
export async function listAssets(signal?: AbortSignal): Promise<AssetListResult> {
  const res = await fetch('/api/risk/assets', { signal });
  if (!res.ok) {
    throw new Error(`Asset list failed: ${res.status}`);
  }
  const payload = (await res.json()) as ListEnvelope;
  return payload.data;
}