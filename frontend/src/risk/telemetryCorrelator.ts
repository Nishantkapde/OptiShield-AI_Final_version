// frontend/src/risk/telemetryCorrelator.ts
// Multi-source telemetry correlation engine.
//
// ── Why correlation matters ─────────────────────────────────
// A single EDR alert at severity 0.7 is weak evidence.
// The SAME asset firing EDR + IAM + SIEM within 5 min is
// near-certain evidence of an active attack.
// Correlation turns N independent noisy alerts into 1 confident
// threat signal, and context dampening suppresses the ones that
// are just business-as-usual (Black Friday, nightly backups).
//
// ── TCI math ────────────────────────────────────────────────
//   1. Per source, take the MAX severity in the window.
//   2. weightedSum = Σ (maxSeverity[source] × SOURCE_WEIGHTS[source])
//   3. rawTCI     = min(1, weightedSum / TCI_NORMALIZATION_FACTOR)
//   4. if distinctSources >= 2: rawTCI ×= MULTI_SOURCE_MULTIPLIER (capped at 1)
//   5. if opContext active: finalTCI = rawTCI × CONTEXT_DAMPENER
//   6. Map finalTCI → status label
import {
  CONTEXT_DAMPENER,
  MULTI_SOURCE_MULTIPLIER,
  SIGNAL_WINDOW_MS,
  SOURCE_WEIGHTS,
  TCI_NORMALIZATION_FACTOR,
  type CorrelatedAssetThreat,
  type OperationalContext,
  type TelemetrySignal,
  type TelemetrySource,
  type ThreatStatusLabel,
} from './schema';

// ============================================================
// Thresholds
// ============================================================
const TCI_SUSPICIOUS = 0.35;
const TCI_CONFIRMED = 0.70;

// ============================================================
// Signal filtering — the sliding window
// ============================================================
function filterActiveSignals(
  signals: TelemetrySignal[],
  assetId: string,
  now: Date
): TelemetrySignal[] {
  const cutoff = now.getTime() - SIGNAL_WINDOW_MS;
  return signals.filter((s) => {
    if (s.assetId !== assetId) return false;
    const t = new Date(s.timestamp).getTime();
    return Number.isFinite(t) && t >= cutoff && t <= now.getTime() + 60_000;
  });
}

// ============================================================
// Per-source max severity extraction
// ============================================================
function maxSeverityBySource(
  signals: TelemetrySignal[]
): Map<TelemetrySource, number> {
  const out = new Map<TelemetrySource, number>();
  for (const s of signals) {
    const prev = out.get(s.source) ?? 0;
    if (s.severityScore > prev) out.set(s.source, s.severityScore);
  }
  return out;
}

// ============================================================
// Weighted sum → raw TCI
// ============================================================
function computeRawTci(signals: TelemetrySignal[]): {
  rawTci: number;
  distinctSources: number;
} {
  const perSource = maxSeverityBySource(signals);
  const distinctSources = perSource.size;

  let weightedSum = 0;
  perSource.forEach((severity, source) => {
    weightedSum += severity * SOURCE_WEIGHTS[source];
  });

  let rawTci = Math.min(1, weightedSum / TCI_NORMALIZATION_FACTOR);

  // Multi-source correlation boost
  if (distinctSources >= 2) {
    rawTci = Math.min(1, rawTci * MULTI_SOURCE_MULTIPLIER);
  }

  return { rawTci, distinctSources };
}

// ============================================================
// Status mapping
// ============================================================
function mapStatus(
  finalTci: number,
  rawTci: number,
  suppressed: boolean
): ThreatStatusLabel {
  if (suppressed && rawTci >= TCI_SUSPICIOUS) return 'OPERATIONAL_SPIKE';
  if (finalTci >= TCI_CONFIRMED) return 'CONFIRMED_ATTACK';
  if (finalTci >= TCI_SUSPICIOUS) return 'SUSPICIOUS';
  return 'HEALTHY';
}

// ============================================================
// Main public API
// ============================================================
export function correlateTelemetrySignals(
  signals: TelemetrySignal[],
  assetId: string,
  opContext?: OperationalContext,
  now: Date = new Date()
): CorrelatedAssetThreat {
  const activeSignals = filterActiveSignals(signals, assetId, now);

  if (activeSignals.length === 0) {
    return {
      assetId,
      activeSignals: [],
      threatConfidenceIndex: 0,
      isSuppressedByContext: false,
      statusLabel: 'HEALTHY',
    };
  }

  const { rawTci } = computeRawTci(activeSignals);

  const contextActive =
    opContext?.isHighTrafficEvent === true || opContext?.isBackupWindow === true;

  const finalTci = contextActive ? rawTci * CONTEXT_DAMPENER : rawTci;
  const isSuppressedByContext = contextActive && rawTci >= TCI_SUSPICIOUS;

  return {
    assetId,
    activeSignals,
    threatConfidenceIndex: Number(finalTci.toFixed(4)),
    isSuppressedByContext,
    statusLabel: mapStatus(finalTci, rawTci, isSuppressedByContext),
  };
}

// ============================================================
// Aggregate helper — runs correlation for many assets at once
// ============================================================
export function correlateAllAssets(
  signals: TelemetrySignal[],
  assetIds: string[],
  opContext?: OperationalContext,
  now: Date = new Date()
): CorrelatedAssetThreat[] {
  return assetIds.map((id) =>
    correlateTelemetrySignals(signals, id, opContext, now)
  );
}

// ============================================================
// Derived noise-reduction metric
// ============================================================
export interface NoiseReductionMetric {
  rawSignalCount: number;
  rawAlertCount: number;         // signals with severity > 0.3
  correlatedThreatCount: number; // assets with SUSPICIOUS or CONFIRMED_ATTACK
  suppressedByContext: number;   // assets downgraded to OPERATIONAL_SPIKE
  noiseReductionPct: number;     // 1 - threats / rawAlerts
}

export function computeNoiseReduction(
  signals: TelemetrySignal[],
  threats: CorrelatedAssetThreat[]
): NoiseReductionMetric {
  const rawSignalCount = signals.length;
  const rawAlertCount = signals.filter((s) => s.severityScore > 0.3).length;
  const correlatedThreatCount = threats.filter(
    (t) => t.statusLabel === 'SUSPICIOUS' || t.statusLabel === 'CONFIRMED_ATTACK'
  ).length;
  const suppressedByContext = threats.filter((t) => t.isSuppressedByContext).length;

  const noiseReductionPct =
    rawAlertCount > 0
      ? Math.max(0, Math.round(((rawAlertCount - correlatedThreatCount) / rawAlertCount) * 100))
      : 0;

  return {
    rawSignalCount,
    rawAlertCount,
    correlatedThreatCount,
    suppressedByContext,
    noiseReductionPct,
  };
}