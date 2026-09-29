// backend/src/services/risk/schema.ts
import { z } from 'zod';

// ============================================================
// [EXTENDED] AssetRiskInput — maintenance fields added as optional.
//            All Pain Point 1 fields remain UNCHANGED.
// ============================================================
export const AssetRiskInputSchema = z
  .object({
    // ---- [PRESERVED] Pain Point 1 core inputs ----
    assetId: z.string().min(1),
    downtimeHours: z.number().nonnegative(),
    hourlyRevenueLoss: z.number().nonnegative(),
    recordsExposed: z.number().nonnegative(),
    costPerRecord: z.number().nonnegative(),
    epssScore: z.number().min(0).max(1),          // EPSS probability 0..1
    assetExposureMultiplier: z.number().nonnegative(),
    annualThreatAttempts: z.number().nonnegative(),

    // ---- [EXTENDED] Maintenance Mode Suppressor inputs ----
    isInMaintenance: z.boolean().optional().default(false),
    maintenanceStart: z.union([z.string().datetime(), z.date()]).optional(),
    maintenanceEnd: z.union([z.string().datetime(), z.date()]).optional(),
    changeTicketId: z.string().min(1).optional(),
  })
  .refine(
    (v) => {
      // If a window is declared, both bounds must exist and be ordered.
      if (!v.maintenanceStart && !v.maintenanceEnd) return true;
      if (!v.maintenanceStart || !v.maintenanceEnd) return false;
      const s = new Date(v.maintenanceStart).getTime();
      const e = new Date(v.maintenanceEnd).getTime();
      return Number.isFinite(s) && Number.isFinite(e) && s < e;
    },
    { message: 'maintenanceStart/maintenanceEnd must both exist and start < end' }
  )
  .refine(
    (v) => {
      // Explicit maintenance flag requires a change ticket for audit trail.
      if (v.isInMaintenance && !v.changeTicketId) return false;
      return true;
    },
    { message: 'changeTicketId is required when isInMaintenance = true' }
  );

export type AssetRiskInput = z.input<typeof AssetRiskInputSchema>;
export type AssetRiskInputParsed = z.infer<typeof AssetRiskInputSchema>;

// ============================================================
// [EXTENDED] RiskAssessmentResult — new maintenance-aware fields.
//            All original Pain Point 1 outputs remain UNCHANGED.
// ============================================================
export type RiskStatus = 'SCHEDULED_MAINTENANCE' | 'UNPLANNED_CYBER_RISK';

export interface RiskAssessmentResult {
  // ---- [PRESERVED] Pain Point 1 outputs ----
  directLoss: number;
  lossEventFrequencyLef: number;
  annualizedLossExpectancyEal: number;

  // ---- [EXTENDED] Maintenance Mode Suppressor outputs ----
  status: RiskStatus;
  isMaintenanceActive: boolean;
  suppressAlerts: boolean;
  plannedOperationalCost: number;
  auditMessage: string;

  // Metadata for compliance exports
  assessedAt: string;          // ISO timestamp
  changeTicketId?: string;
}