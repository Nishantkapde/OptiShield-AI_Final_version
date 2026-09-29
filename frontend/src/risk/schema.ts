// frontend/src/risk/schema.ts
// Zod schemas + TypeScript types for Pain Points 2, 3, 4, 5 & 6.
import { z } from 'zod';

// ════════════════════════════════════════════════════════════
// [PP2] BUDGET OPTIMIZATION
// ════════════════════════════════════════════════════════════

/** Threat alert levels — drive the risk-reduction multiplier. */
export const ThreatAlertLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export type ThreatAlertLevel = z.infer<typeof ThreatAlertLevelSchema>;

/** Dynamic multiplier applied to a control's baseline ΔEAL per threat level. */
export const THREAT_MULTIPLIERS: Record<ThreatAlertLevel, number> = {
  LOW: 1.0,
  MEDIUM: 1.25,
  HIGH: 1.5,
  CRITICAL: 2.0,
};

/** Security control — the atom being optimized. */
export const SecurityControlSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  /** Annual cost in USD */
  cost: z.number().nonnegative(),
  /** Baseline reduction in Expected Annual Loss (USD) at LOW threat */
  riskReductionEal: z.number().nonnegative(),
});
export type SecurityControl = z.infer<typeof SecurityControlSchema>;

/** Optimization input — what the caller provides. */
export const OptimizationInputSchema = z.object({
  controls: z.array(SecurityControlSchema),
  budget: z.number().nonnegative(),
  threatAlertLevel: ThreatAlertLevelSchema,
});
export type OptimizationInput = z.infer<typeof OptimizationInputSchema>;

/** Efficient frontier point — one dot on the curve. */
export const EfficientFrontierPointSchema = z.object({
  /** Budget value at this step (USD) */
  budgetStep: z.number().nonnegative(),
  /** Maximum achievable ΔEAL at this budget (USD) */
  maxRiskReduction: z.number().nonnegative(),
  /** ROSI at this budget step (%) */
  rosi: z.number(),
});
export type EfficientFrontierPoint = z.infer<typeof EfficientFrontierPointSchema>;

/** Optimization result — what the caller receives. */
export const OptimizationResultSchema = z.object({
  recommendedControls: z.array(SecurityControlSchema),
  totalCost: z.number().nonnegative(),
  totalRiskReduction: z.number().nonnegative(),
  /** Return on Security Investment, % */
  overallRosi: z.number(),
  efficientFrontierPoints: z.array(EfficientFrontierPointSchema),
});
export type OptimizationResult = z.infer<typeof OptimizationResultSchema>;

// ════════════════════════════════════════════════════════════
// [PP3] DELTA RISK ENGINE
// ════════════════════════════════════════════════════════════

/** Client-side mirror of the backend's AssetRiskInput schema. */
export const AssetRiskInputSchema = z.object({
  assetId: z.string().min(1),
  downtimeHours: z.number().nonnegative(),
  hourlyRevenueLoss: z.number().nonnegative(),
  recordsExposed: z.number().nonnegative(),
  costPerRecord: z.number().nonnegative(),
  /** EPSS probability, 0..1 */
  epssScore: z.number().min(0).max(1),
  assetExposureMultiplier: z.number().nonnegative(),
  annualThreatAttempts: z.number().nonnegative(),
  // Maintenance Mode Suppressor fields (all optional)
  isInMaintenance: z.boolean().optional(),
  maintenanceStart: z.union([z.string().datetime(), z.date()]).optional(),
  maintenanceEnd: z.union([z.string().datetime(), z.date()]).optional(),
  changeTicketId: z.string().optional(),
});
export type AssetRiskInput = z.infer<typeof AssetRiskInputSchema>;

export type RiskStatus = 'SCHEDULED_MAINTENANCE' | 'UNPLANNED_CYBER_RISK';

/** Mirrors the Pain Point 1 output shape. */
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

/** Telemetry event — what the delta engine consumes. */
export const TelemetryEventTypeSchema = z.enum([
  'EPSS_UPDATE',
  'MAINTENANCE_TOGGLE',
  'DOWNTIME_CHANGE',
]);
export type TelemetryEventType = z.infer<typeof TelemetryEventTypeSchema>;

export const TelemetryEventSchema = z.object({
  id: z.string().min(1),
  assetId: z.string().min(1),
  eventType: TelemetryEventTypeSchema,
  /** number for EPSS/DOWNTIME, boolean for MAINTENANCE */
  newValue: z.union([z.number(), z.boolean()]),
  timestamp: z.string().datetime(),
});
export type TelemetryEvent = z.infer<typeof TelemetryEventSchema>;

/** The O(1)-updatable aggregate. */
export const SystemRiskSummarySchema = z.object({
  totalEal: z.number(),
  totalDirectLoss: z.number(),
  activeAssetCount: z.number().int().nonnegative(),
  lastEventProcessed: TelemetryEventSchema.optional(),
  /** Time taken for the most recent delta recalculation (ms) */
  lastRecalculationTimeMs: z.number().nonnegative(),
});
export type SystemRiskSummary = z.infer<typeof SystemRiskSummarySchema>;

// ════════════════════════════════════════════════════════════
// [PP4] MULTI-SOURCE TELEMETRY CORRELATION
// ════════════════════════════════════════════════════════════

/** Security telemetry sources feeding the correlation engine. */
export const TelemetrySourceSchema = z.enum(['EDR', 'SIEM', 'IAM', 'CSPM']);
export type TelemetrySource = z.infer<typeof TelemetrySourceSchema>;

/** One raw signal from one source about one asset. */
export const TelemetrySignalSchema = z.object({
  id: z.string().min(1),
  assetId: z.string().min(1),
  source: TelemetrySourceSchema,
  /** 0..1 — severity assigned by the source tool */
  severityScore: z.number().min(0).max(1),
  rawEventName: z.string().min(1),
  timestamp: z.string().datetime(),
});
export type TelemetrySignal = z.infer<typeof TelemetrySignalSchema>;

/** Business context that can dampen false-positive noise. */
export const OperationalContextSchema = z.object({
  isHighTrafficEvent: z.boolean().optional(),
  isBackupWindow: z.boolean().optional(),
  description: z.string().optional(),
});
export type OperationalContext = z.infer<typeof OperationalContextSchema>;

export const ThreatStatusLabelSchema = z.enum([
  'HEALTHY',
  'OPERATIONAL_SPIKE',
  'SUSPICIOUS',
  'CONFIRMED_ATTACK',
]);
export type ThreatStatusLabel = z.infer<typeof ThreatStatusLabelSchema>;

/** Per-asset correlation output. */
export const CorrelatedAssetThreatSchema = z.object({
  assetId: z.string().min(1),
  activeSignals: z.array(TelemetrySignalSchema),
  /** 0..1 — final TCI after correlation + context dampening */
  threatConfidenceIndex: z.number().min(0).max(1),
  /** true when the dampener actually downgraded a would-be threat */
  isSuppressedByContext: z.boolean(),
  statusLabel: ThreatStatusLabelSchema,
});
export type CorrelatedAssetThreat = z.infer<typeof CorrelatedAssetThreatSchema>;

/** Source weights — how much each source contributes to raw TCI. */
export const SOURCE_WEIGHTS: Record<TelemetrySource, number> = {
  EDR: 1.5,
  IAM: 1.2,
  SIEM: 1.0,
  CSPM: 0.9,
};

/** Divisor to normalize weightedSum → [0, 1]. */
export const TCI_NORMALIZATION_FACTOR = 2.5;

/** Multiplier applied when 2+ distinct sources agree on the same asset. */
export const MULTI_SOURCE_MULTIPLIER = 1.3;

/** Multiplier applied to rawTCI when operational context suppresses noise. */
export const CONTEXT_DAMPENER = 0.2;

/** Sliding window — signals older than this are ignored. */
export const SIGNAL_WINDOW_MS = 5 * 60 * 1000;

// ════════════════════════════════════════════════════════════
// [PP5] MONTE CARLO / VALUE AT RISK
// ════════════════════════════════════════════════════════════

/** Parameters for a PERT distribution (min, mode, max). */
export const DistributionParamsSchema = z.object({
  min: z.number().nonnegative(),
  mostLikely: z.number().nonnegative(),
  max: z.number().nonnegative(),
});
export type DistributionParams = z.infer<typeof DistributionParamsSchema>;

export const MonteCarloInputSchema = z.object({
  assetId: z.string().min(1),
  lossDistribution: DistributionParamsSchema,
  frequencyDistribution: DistributionParamsSchema,
  iterations: z.number().int().positive().optional(),
});
export type MonteCarloInput = z.infer<typeof MonteCarloInputSchema>;

/** One point on the Loss Exceedance Curve. */
export const LossExceedancePointSchema = z.object({
  /** Loss threshold in USD */
  lossThreshold: z.number().nonnegative(),
  /** 0..1 — probability that annual loss exceeds this threshold */
  probabilityExceeded: z.number().min(0).max(1),
});
export type LossExceedancePoint = z.infer<typeof LossExceedancePointSchema>;

/** Full simulation output. */
export const VaRMetricsSchema = z.object({
  meanEal: z.number().nonnegative(),
  medianLoss: z.number().nonnegative(),
  var90: z.number().nonnegative(),
  var95: z.number().nonnegative(),
  var99: z.number().nonnegative(),
  maxProbableLoss: z.number().nonnegative(),
  lossExceedanceCurve: z.array(LossExceedancePointSchema),
  /** Wall-clock duration of the simulation (ms) */
  processingTimeMs: z.number().nonnegative(),
  /** Number of iterations actually run */
  iterations: z.number().int().positive(),
});
export type VaRMetrics = z.infer<typeof VaRMetricsSchema>;

export const DEFAULT_MONTE_CARLO_ITERATIONS = 10_000;
export const LEC_STEPS = 20;

// ════════════════════════════════════════════════════════════
// [PP6] REGULATORY COMPLIANCE & BOARD REPORTING
// ════════════════════════════════════════════════════════════

/** Regulatory frameworks OptiShield supports. */
export const FrameworkTypeSchema = z.enum([
  'SEBI_CSCRF',
  'ISO_27001',
  'NIST_CSF_2_0',
]);
export type FrameworkType = z.infer<typeof FrameworkTypeSchema>;

/** One regulatory control requirement. */
export const RegulatoryControlSchema = z.object({
  id: z.string().min(1),
  framework: FrameworkTypeSchema,
  /** e.g. "A.12.1.4" (ISO) or "CSCRF-12" */
  controlCode: z.string().min(1),
  title: z.string().min(1),
  /**
   * Category used to MATCH against SecurityControl.category.
   * e.g. an ISO control requiring "EDR" matches a selected control
   * whose category is "EDR".
   */
  requiredControlCategory: z.string().min(1),
  /** 1..10 — importance of this control in the framework */
  weight: z.number().int().min(1).max(10),
});
export type RegulatoryControl = z.infer<typeof RegulatoryControlSchema>;

/** Board-approved risk appetite limits. */
export const RiskAppetiteConfigSchema = z.object({
  /** Max acceptable Expected Annual Loss in USD */
  maxAcceptableEal: z.number().nonnegative(),
  /** Max acceptable 95% VaR in USD */
  maxAcceptableVar95: z.number().nonnegative(),
});
export type RiskAppetiteConfig = z.infer<typeof RiskAppetiteConfigSchema>;

/** Per-framework compliance result. */
export const ComplianceStatusSchema = z.object({
  framework: FrameworkTypeSchema,
  /** 0..100 — weighted coverage */
  coveragePercentage: z.number().min(0).max(100),
  satisfiedControlIds: z.array(z.string()),
  missingControlIds: z.array(z.string()),
  /** true when 95% VaR <= maxAcceptableVar95 */
  isWithinRiskAppetite: z.boolean(),
  /** Positive = over appetite, negative = headroom (USD) */
  varBreachAmount: z.number(),
});
export type ComplianceStatus = z.infer<typeof ComplianceStatusSchema>;

/** Framework display metadata. */
export const FRAMEWORK_LABELS: Record<FrameworkType, string> = {
  SEBI_CSCRF: 'SEBI CSCRF',
  ISO_27001: 'ISO 27001',
  NIST_CSF_2_0: 'NIST CSF 2.0',
};

/** Board appetite status threshold — 80% of limit → warning. */
export const APPETITE_WARNING_PCT = 0.8;
// ════════════════════════════════════════════════════════════
// [PP7] SUPPLY CHAIN DEPENDENCY GRAPH
// ════════════════════════════════════════════════════════════

export const NodeTypeSchema = z.enum(['VENDOR', 'INTERNAL_ASSET']);
export type NodeType = z.infer<typeof NodeTypeSchema>;

export const DependencyNodeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: NodeTypeSchema,
  /** Direct EAL for this node in isolation */
  baseEal: z.number().nonnegative(),
  /** Compromise likelihood (0..1) */
  epssScore: z.number().min(0).max(1),
  isThirdParty: z.boolean(),
});
export type DependencyNode = z.infer<typeof DependencyNodeSchema>;

export const DependencyEdgeSchema = z.object({
  id: z.string().min(1),
  sourceNodeId: z.string().min(1),
  targetNodeId: z.string().min(1),
  /** 0.1 (loose) to 1.0 (tight) */
  couplingWeight: z.number().min(0.1).max(1.0),
  /** USD that transfers from source to target on compromise */
  transferLossAmount: z.number().nonnegative(),
});
export type DependencyEdge = z.infer<typeof DependencyEdgeSchema>;

export const SupplyChainRiskSummarySchema = z.object({
  totalCascadedEal: z.number().nonnegative(),
  criticalVendorCount: z.number().int().nonnegative(),
  singlePointsOfFailure: z.array(z.string()),
  /** nodeId → 0..1 normalized impact */
  nodeImpactScores: z.record(z.string(), z.number()),
  /** nodeId → cascaded EAL in USD */
  cascadedEalByNode: z.record(z.string(), z.number()),
});
export type SupplyChainRiskSummary = z.infer<typeof SupplyChainRiskSummarySchema>;

/** Threshold above which a vendor is "critical" */
export const CRITICAL_VENDOR_EPSS_THRESHOLD = 0.28;
/** Minimum coupling weight for an edge to count toward SPOF */
export const SPOF_COUPLING_THRESHOLD = 0.9;
/** Minimum outgoing edges for a vendor to qualify as SPOF */
export const SPOF_MIN_OUTGOING_EDGES = 2;
// ════════════════════════════════════════════════════════════
// [PP8] REMEDIATION PLAYBOOKS
// ════════════════════════════════════════════════════════════

export const RemediationCategorySchema = z.enum([
  'PATCH_MANAGEMENT',
  'IAM_HARDENING',
  'NETWORK_ISOLATION',
  'CONFIG_REMEDIATION',
]);
export type RemediationCategory = z.infer<typeof RemediationCategorySchema>;

export const TechnicalActionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: RemediationCategorySchema,
  targetAssetId: z.string().min(1),
  /** CLI / Terraform / policy snippet the operator can copy */
  commandScriptSnippet: z.string().optional(),
  estimatedHours: z.number().nonnegative(),
  costEstimate: z.number().nonnegative(),
});
export type TechnicalAction = z.infer<typeof TechnicalActionSchema>;

export const ActionablePlaybookSchema = z.object({
  id: z.string().min(1),
  action: TechnicalActionSchema,
  addressableThreatId: z.string().min(1),
  potentialEalReduction: z.number().nonnegative(),
  /** Remediation Efficiency Index = ΔEAL / (hours×50 + cost) */
  reiScore: z.number().nonnegative(),
  executionStatus: z.enum(['PENDING', 'SIMULATED_EXECUTIVE', 'APPLIED']),
});
export type ActionablePlaybook = z.infer<typeof ActionablePlaybookSchema>;

/** Blended engineering rate used in the REI denominator (USD/hour). */
export const ENGINEERING_HOURLY_RATE = 50;

/** Base per-signal dollar value used to scale ΔEAL by severity. */
export const BASE_EAL_PER_SIGNAL = 180_000;
// ════════════════════════════════════════════════════════════
// [PP9] EXECUTIVE DASHBOARD — HEATMAP + FILTERS
// ════════════════════════════════════════════════════════════

export const HeatmapTierSchema = z.enum([
  'VERY_LOW',
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
]);
export type HeatmapTier = z.infer<typeof HeatmapTierSchema>;

export const HeatmapCellSchema = z.object({
  /** 1..5 — likelihood bucket, derived from LEF */
  likelihoodScore: z.number().int().min(1).max(5),
  /** 1..5 — impact bucket, derived from directLoss */
  impactScore: z.number().int().min(1).max(5),
  tier: HeatmapTierSchema,
  /** Sum of annualizedLossExpectancyEal for assets in this cell */
  totalEal: z.number().nonnegative(),
  assetIds: z.array(z.string()),
});
export type HeatmapCell = z.infer<typeof HeatmapCellSchema>;

export const DashboardFilterSchema = z.object({
  selectedHeatmapCell: z
    .object({
      likelihood: z.number().int().min(1).max(5),
      impact: z.number().int().min(1).max(5),
    })
    .optional(),
  activeCategory: z.string().optional(),
});
export type DashboardFilter = z.infer<typeof DashboardFilterSchema>;

/** Display labels + colors per tier */
export const HEATMAP_TIER_VISUALS: Record<
  HeatmapTier,
  { label: string; bg: string; border: string; text: string; glow: string }
> = {
  VERY_LOW: {
    label: 'Very Low',
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/40',
    text: 'text-emerald-300',
    glow: 'hover:shadow-emerald-500/20',
  },
  LOW: {
    label: 'Low',
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500/40',
    text: 'text-yellow-300',
    glow: 'hover:shadow-yellow-500/20',
  },
  MEDIUM: {
    label: 'Medium',
    bg: 'bg-orange-500/25',
    border: 'border-orange-500/40',
    text: 'text-orange-300',
    glow: 'hover:shadow-orange-500/20',
  },
  HIGH: {
    label: 'High',
    bg: 'bg-rose-500/30',
    border: 'border-rose-500/40',
    text: 'text-rose-300',
    glow: 'hover:shadow-rose-500/20',
  },
  CRITICAL: {
    label: 'Critical',
    bg: 'bg-rose-700/50',
    border: 'border-rose-600/60',
    text: 'text-rose-100',
    glow: 'hover:shadow-rose-700/30',
  },
};
// ════════════════════════════════════════════════════════════
// [PP10] PERSISTENCE + AUDIT + REPORT EXPORT
// ════════════════════════════════════════════════════════════

export const AuditActionTypeSchema = z.enum([
  'PARAMETER_UPDATE',
  'BUDGET_OPTIMIZATION',
  'TELEMETRY_DAMPEN',
  'REMEDIATION_APPLIED',
]);
export type AuditActionType = z.infer<typeof AuditActionTypeSchema>;

export const AuditLogEntrySchema = z.object({
  id: z.string().min(1),
  timestamp: z.string().datetime(),
  actionType: AuditActionTypeSchema,
  actor: z.string().min(1),
  details: z.string(),
  /** Hash of the previous entry — root uses the genesis hash */
  previousHash: z.string().min(1),
  /** SHA-256 hex of `${previousHash}|${payload}` */
  currentHash: z.string().length(64),
});
export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;

export const ReportExportFormatSchema = z.enum(['PDF', 'MARKDOWN', 'JSON']);
export type ReportExportFormat = z.infer<typeof ReportExportFormatSchema>;

export const ReportExportConfigSchema = z.object({
  framework: z.string().min(1),
  includeMonteCarloVaR: z.boolean(),
  includeRemediationPlan: z.boolean(),
  format: ReportExportFormatSchema,
});
export type ReportExportConfig = z.infer<typeof ReportExportConfigSchema>;

/** Persisted platform snapshot written to IndexedDB. */
export const PersistedRiskStateSchema = z.object({
  schemaVersion: z.literal(1),
  savedAt: z.string().datetime(),
  cyberBudget: z.number(),
  threatLevel: z.number(),
  maintenanceActive: z.boolean(),
  auditLog: z.array(AuditLogEntrySchema),
});
export type PersistedRiskState = z.infer<typeof PersistedRiskStateSchema>;

/** Genesis hash used as the `previousHash` of the very first entry. */
export const AUDIT_GENESIS_HASH =
  '0000000000000000000000000000000000000000000000000000000000000000';

/** IndexedDB coordinates. */
export const IDB_NAME = 'optishield';
export const IDB_VERSION = 1;
export const IDB_STORE = 'risk-state';
export const IDB_KEY = 'latest';