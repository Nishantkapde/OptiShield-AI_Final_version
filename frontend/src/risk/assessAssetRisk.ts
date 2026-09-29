// frontend/src/risk/assessAssetRisk.ts
// Pure-function port of the Pain Point 1 math.
// Must be byte-equivalent to backend/src/services/risk/assessAssetRisk.ts.
import type { AssetRiskInput, RiskAssessmentResult } from './schema';

/**
 * Whether a maintenance window is currently active.
 * Rule 1: explicit flag wins.
 * Rule 2: `now` inside [maintenanceStart, maintenanceEnd].
 */
export function isMaintenanceActive(
  input: Pick<AssetRiskInput, 'isInMaintenance' | 'maintenanceStart' | 'maintenanceEnd'>,
  now: Date = new Date()
): boolean {
  if (input.isInMaintenance === true) return true;
  if (input.maintenanceStart && input.maintenanceEnd) {
    const start = new Date(input.maintenanceStart).getTime();
    const end = new Date(input.maintenanceEnd).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) return false;
    const t = now.getTime();
    return t >= start && t <= end;
  }
  return false;
}

/**
 * Deterministic Pain Point 1 assessment.
 * O(1) — constant number of arithmetic operations.
 */
export function assessAssetRisk(
  input: AssetRiskInput,
  now: Date = new Date()
): RiskAssessmentResult {
  const maintenanceActive = isMaintenanceActive(input, now);

  // ----------------------------------------------------------
  // Branch A — maintenance active → suppress unplanned cyber risk
  // ----------------------------------------------------------
  if (maintenanceActive) {
    const plannedOperationalCost = input.downtimeHours * input.hourlyRevenueLoss;
    return {
      directLoss: 0,
      lossEventFrequencyLef: 0,
      annualizedLossExpectancyEal: 0,
      status: 'SCHEDULED_MAINTENANCE',
      isMaintenanceActive: true,
      suppressAlerts: true,
      plannedOperationalCost,
      auditMessage:
        `[SCHEDULED_MAINTENANCE] asset=${input.assetId} ` +
        `ticket=${input.changeTicketId ?? 'N/A'}`,
      assessedAt: now.toISOString(),
      changeTicketId: input.changeTicketId,
    };
  }

  // ----------------------------------------------------------
  // Branch B — no maintenance → original Pain Point 1 formulas
  // ----------------------------------------------------------
  const directLoss =
    input.downtimeHours * input.hourlyRevenueLoss +
    input.recordsExposed * input.costPerRecord;

  const lossEventFrequencyLef =
    input.epssScore * input.assetExposureMultiplier * input.annualThreatAttempts;

  const annualizedLossExpectancyEal = directLoss * lossEventFrequencyLef;

  return {
    directLoss,
    lossEventFrequencyLef,
    annualizedLossExpectancyEal,
    status: 'UNPLANNED_CYBER_RISK',
    isMaintenanceActive: false,
    suppressAlerts: false,
    plannedOperationalCost: 0,
    auditMessage:
      `[UNPLANNED_CYBER_RISK] asset=${input.assetId} ` +
      `directLoss=${directLoss.toFixed(2)} ` +
      `LEF=${lossEventFrequencyLef.toFixed(4)} ` +
      `EAL=${annualizedLossExpectancyEal.toFixed(2)}`,
    assessedAt: now.toISOString(),
    changeTicketId: input.changeTicketId,
  };
}