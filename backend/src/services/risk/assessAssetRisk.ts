// backend/src/services/risk/assessAssetRisk.ts
import {
  AssetRiskInput,
  AssetRiskInputSchema,
  RiskAssessmentResult,
} from './schema';

// ============================================================
// [EXTENDED] Pure helper — decides whether a maintenance window
//            is currently active. Kept separate so it is unit-testable.
// ============================================================
export function isMaintenanceActive(
  input: Pick<AssetRiskInput, 'isInMaintenance' | 'maintenanceStart' | 'maintenanceEnd'>,
  now: Date = new Date()
): boolean {
  // Rule 1: explicit flag wins.
  if (input.isInMaintenance === true) return true;

  // Rule 2: active timestamp window.
  if (input.maintenanceStart && input.maintenanceEnd) {
    const start = new Date(input.maintenanceStart).getTime();
    const end = new Date(input.maintenanceEnd).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) return false;
    const t = now.getTime();
    return t >= start && t <= end; // inclusive boundaries
  }

  return false;
}

// ============================================================
// Core Assessment — orchestrates Pain Point 1 math and the
// Maintenance Mode Suppressor. Pure function, no I/O.
// ============================================================
export function assessAssetRisk(
  rawInput: unknown,
  now: Date = new Date()
): RiskAssessmentResult {
  // ---- [PRESERVED] Validate using existing Pain Point 1 schema ----
  const input = AssetRiskInputSchema.parse(rawInput);

  const maintenanceActive = isMaintenanceActive(input, now);

  // ----------------------------------------------------------
  // [EXTENDED] Branch A — Maintenance mode ACTIVE.
  //            Suppress unplanned cyber risk; record planned cost.
  // ----------------------------------------------------------
  if (maintenanceActive) {
    const plannedOperationalCost = input.downtimeHours * input.hourlyRevenueLoss;

    const auditMessage =
      `[SCHEDULED_MAINTENANCE] asset=${input.assetId} ` +
      `ticket=${input.changeTicketId ?? 'N/A'} ` +
      `window=${input.maintenanceStart ?? 'flag'}..${input.maintenanceEnd ?? 'flag'} ` +
      `plannedOperationalCost=${plannedOperationalCost.toFixed(2)} ` +
      `ref=SEBI-CSCRF/ISO-27001:A.12.1.4`;

    return {
      // Pain Point 1 outputs zeroed — no unplanned cyber loss.
      directLoss: 0,
      lossEventFrequencyLef: 0,
      annualizedLossExpectancyEal: 0,

      // Maintenance Mode Suppressor outputs.
      status: 'SCHEDULED_MAINTENANCE',
      isMaintenanceActive: true,
      suppressAlerts: true,
      plannedOperationalCost,
      auditMessage,
      assessedAt: now.toISOString(),
      changeTicketId: input.changeTicketId,
    };
  }

  // ----------------------------------------------------------
  // [PRESERVED] Branch B — No maintenance. Original Pain Point 1
  //             formulas, applied verbatim.
  // ----------------------------------------------------------
  const directLoss =
    input.downtimeHours * input.hourlyRevenueLoss +
    input.recordsExposed * input.costPerRecord;

  const lossEventFrequencyLef =
    input.epssScore * input.assetExposureMultiplier * input.annualThreatAttempts;

  const annualizedLossExpectancyEal = directLoss * lossEventFrequencyLef;

  const auditMessage =
    `[UNPLANNED_CYBER_RISK] asset=${input.assetId} ` +
    `directLoss=${directLoss.toFixed(2)} ` +
    `LEF=${lossEventFrequencyLef.toFixed(4)} ` +
    `EAL=${annualizedLossExpectancyEal.toFixed(2)}`;

  return {
    directLoss,
    lossEventFrequencyLef,
    annualizedLossExpectancyEal,

    status: 'UNPLANNED_CYBER_RISK',
    isMaintenanceActive: false,
    suppressAlerts: false,
    plannedOperationalCost: 0,
    auditMessage,
    assessedAt: now.toISOString(),
    changeTicketId: input.changeTicketId,
  };
}