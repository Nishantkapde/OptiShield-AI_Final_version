// frontend/src/risk/TelemetryGrid.tsx
// Multi-source telemetry correlation matrix.
// NOTE: This file lives in `src/risk/` and is distinct from
//       `src/components/TelemetryGrid.tsx` (PP1 feed-status panel).
import React, { memo, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Flame,
  Moon,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  Zap,
} from 'lucide-react';
import { useTelemetryGrid } from './useTelemetryGrid';
import type {
  CorrelatedAssetThreat,
  TelemetrySignal,
  TelemetrySource,
  ThreatStatusLabel,
} from './schema';

// ============================================================
// Static demo data — replace with backend feed later
// ============================================================
const DEMO_ASSETS = [
  'srv-db-01',
  'srv-pay-02',
  'srv-auth-01',
  'srv-api-03',
  'srv-cache-04',
  'srv-ml-05',
] as const;

const mkSignal = (
  id: string,
  assetId: string,
  source: TelemetrySource,
  severityScore: number,
  rawEventName: string,
  minutesAgo: number
): TelemetrySignal => ({
  id,
  assetId,
  source,
  severityScore,
  rawEventName,
  timestamp: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
});

const DEMO_SIGNALS: TelemetrySignal[] = [
  // srv-db-01 — multi-source high severity → CONFIRMED_ATTACK
  mkSignal('sig-1', 'srv-db-01', 'EDR', 0.85, 'Suspicious PowerShell Execution', 1),
  mkSignal('sig-2', 'srv-db-01', 'SIEM', 0.72, 'Multiple Failed Auth Attempts', 2),
  mkSignal('sig-3', 'srv-db-01', 'IAM', 0.78, 'Privilege Escalation Detected', 1.5),

  // srv-pay-02 — 2 sources moderate → SUSPICIOUS
  mkSignal('sig-4', 'srv-pay-02', 'EDR', 0.45, 'Unusual Process Spawn', 3),
  mkSignal('sig-5', 'srv-pay-02', 'SIEM', 0.38, 'Unusual Outbound Traffic', 2.5),

  // srv-auth-01 — single high-severity IAM → SUSPICIOUS
  mkSignal('sig-6', 'srv-auth-01', 'IAM', 0.75, 'MFA Bypass Attempt', 4),

  // srv-api-03 — 2 sources low → HEALTHY
  mkSignal('sig-7', 'srv-api-03', 'SIEM', 0.31, 'High Request Rate', 1),
  mkSignal('sig-8', 'srv-api-03', 'EDR', 0.28, 'Legitimate Process', 1),

  // srv-cache-04 — very low → HEALTHY
  mkSignal('sig-9', 'srv-cache-04', 'SIEM', 0.15, 'Routine Cache Flush', 5),

  // srv-ml-05 — 2 sources moderate-high → SUSPICIOUS
  mkSignal('sig-10', 'srv-ml-05', 'EDR', 0.55, 'Unusual Model Artifact Access', 2),
  mkSignal('sig-11', 'srv-ml-05', 'CSPM', 0.42, 'Misconfigured S3 Policy', 3),
];

// ============================================================
// Visual configs
// ============================================================
const SOURCE_COLORS: Record<TelemetrySource, string> = {
  EDR: '#3b82f6',
  SIEM: '#a855f7',
  IAM: '#06b6d4',
  CSPM: '#f59e0b',
};

const STATUS_VISUALS: Record<
  ThreatStatusLabel,
  { text: string; bg: string; border: string; bar: string; label: string; icon: React.ElementType }
> = {
  HEALTHY: {
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    bar: 'bg-emerald-500',
    label: 'Healthy',
    icon: CheckCircle2,
  },
  OPERATIONAL_SPIKE: {
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    bar: 'bg-amber-500',
    label: 'Operational Spike',
    icon: Zap,
  },
  SUSPICIOUS: {
    text: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    bar: 'bg-orange-500',
    label: 'Suspicious',
    icon: AlertTriangle,
  },
  CONFIRMED_ATTACK: {
    text: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    bar: 'bg-rose-500',
    label: 'Confirmed Attack',
    icon: ShieldAlert,
  },
};

// ============================================================
// Sub-component: one source cell
// ============================================================
interface SourceCellProps {
  source: TelemetrySource;
  signals: TelemetrySignal[];
}

const SourceCell = memo<SourceCellProps>(({ source, signals }) => {
  const matching = signals.filter((s) => s.source === source);
  const maxSeverity = matching.reduce((m, s) => Math.max(m, s.severityScore), 0);
  const count = matching.length;
  const color = SOURCE_COLORS[source];

  if (count === 0) {
    return (
      <div className="text-center text-[10px] text-slate-600 font-mono">—</div>
    );
  }

  const intensity = maxSeverity >= 0.7 ? 1 : maxSeverity >= 0.4 ? 0.6 : 0.3;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-[10px] font-bold text-white"
        style={{ backgroundColor: color, opacity: intensity }}
        title={matching.map((s) => `${s.rawEventName} (${s.severityScore})`).join('\n')}
      >
        {count}
      </div>
      <span className="text-[9px] font-mono text-slate-500">
        {maxSeverity.toFixed(2)}
      </span>
    </div>
  );
});
SourceCell.displayName = 'SourceCell';

// ============================================================
// Sub-component: one row
// ============================================================
const ThreatRow = memo<{ threat: CorrelatedAssetThreat }>(({ threat }) => {
  const visuals = STATUS_VISUALS[threat.statusLabel];
  const StatusIcon = visuals.icon;
  const tciPct = Math.round(threat.threatConfidenceIndex * 100);

  return (
    <div
      className={`grid grid-cols-12 gap-2 items-center px-3 py-3 border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 transition-colors ${
        threat.statusLabel === 'CONFIRMED_ATTACK' ? 'bg-rose-500/5' : ''
      }`}
    >
      {/* Asset name */}
      <div className="col-span-3 flex items-center gap-2">
        <span className="text-xs font-mono text-white">{threat.assetId}</span>
      </div>

      {/* Source cells */}
      <div className="col-span-1 flex justify-center">
        <SourceCell source="EDR" signals={threat.activeSignals} />
      </div>
      <div className="col-span-1 flex justify-center">
        <SourceCell source="SIEM" signals={threat.activeSignals} />
      </div>
      <div className="col-span-1 flex justify-center">
        <SourceCell source="IAM" signals={threat.activeSignals} />
      </div>
      <div className="col-span-1 flex justify-center">
        <SourceCell source="CSPM" signals={threat.activeSignals} />
      </div>

      {/* TCI bar */}
      <div className="col-span-3 px-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">
            TCI
          </span>
          <span className={`text-[11px] font-mono font-bold ${visuals.text}`}>
            {tciPct}%
          </span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-1.5 rounded-full transition-all duration-500 ${visuals.bar}`}
            style={{ width: `${tciPct}%` }}
          />
        </div>
      </div>

      {/* Status badge */}
      <div className="col-span-2 flex justify-end">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${visuals.bg} ${visuals.text} ${visuals.border}`}
        >
          <StatusIcon className="w-3 h-3" />
          {visuals.label}
        </span>
      </div>
    </div>
  );
});
ThreatRow.displayName = 'ThreatRow';

// ============================================================
// Main component
// ============================================================
const TelemetryCorrelationGrid: React.FC = () => {
  const {
    signals,
    threats,
    context,
    metrics,
    toggleHighTrafficEvent,
    toggleBackupWindow,
  } = useTelemetryGrid(DEMO_SIGNALS, DEMO_ASSETS as unknown as string[]);

  const rawTciByAsset = useMemo(() => {
    // Quick reference for "what would TCI be without context"
    const map = new Map<string, number>();
    for (const t of threats) {
      const raw = t.isSuppressedByContext
        ? t.threatConfidenceIndex / 0.2
        : t.threatConfidenceIndex;
      map.set(t.assetId, Math.min(1, raw));
    }
    return map;
  }, [threats]);

  const contextActive =
    context.isHighTrafficEvent === true || context.isBackupWindow === true;

  return (
    <section
      className="bg-slate-950 border border-slate-800 rounded-xl p-4 lg:p-5 shadow-2xl"
      aria-labelledby="telemetry-correlation-heading"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <Activity className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2
              id="telemetry-correlation-heading"
              className="text-base lg:text-lg font-semibold text-white"
            >
              Multi-Source Correlation Matrix
            </h2>
            <p className="text-xs text-slate-400">
              EDR · SIEM · IAM · CSPM — 5-minute sliding window, weighted TCI
            </p>
          </div>
        </div>

        {/* Context toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => toggleHighTrafficEvent(!context.isHighTrafficEvent)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-colors ${
              context.isHighTrafficEvent
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/40'
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-700'
            }`}
            aria-pressed={context.isHighTrafficEvent}
          >
            <Flame className="w-3.5 h-3.5" />
            Black Friday / Flash Sale Mode
          </button>
          <button
            onClick={() => toggleBackupWindow(!context.isBackupWindow)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-colors ${
              context.isBackupWindow
                ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/40'
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-700'
            }`}
            aria-pressed={context.isBackupWindow}
          >
            <Moon className="w-3.5 h-3.5" />
            Backup Window
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard
          label="Raw Signals"
          value={metrics.rawSignalCount.toString()}
          accent="text-slate-300"
          icon={Activity}
        />
        <KpiCard
          label="Naive Alerts"
          value={metrics.rawAlertCount.toString()}
          accent="text-amber-400"
          icon={AlertTriangle}
          sub="severity > 0.3"
        />
        <KpiCard
          label="Correlated Threats"
          value={metrics.correlatedThreatCount.toString()}
          accent="text-rose-400"
          icon={ShieldAlert}
          sub="SUSPICIOUS + CONFIRMED"
        />
        <KpiCard
          label="Noise Reduced"
          value={`${metrics.noiseReductionPct}%`}
          accent="text-emerald-400"
          icon={TrendingDown}
          sub={contextActive ? `${metrics.suppressedByContext} suppressed by context` : 'correlation only'}
        />
      </div>

      {/* Matrix header */}
      <div className="border border-slate-800 rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-900 border-b border-slate-800 text-[10px] uppercase tracking-wide text-slate-500 font-medium">
          <div className="col-span-3">Asset</div>
          <div className="col-span-1 text-center">EDR</div>
          <div className="col-span-1 text-center">SIEM</div>
          <div className="col-span-1 text-center">IAM</div>
          <div className="col-span-1 text-center">CSPM</div>
          <div className="col-span-3 text-center">Threat Confidence Index</div>
          <div className="col-span-2 text-right">Status</div>
        </div>

        <div>
          {threats.map((t) => (
            <ThreatRow key={t.assetId} threat={t} />
          ))}
        </div>
      </div>

      {/* Context banner */}
      {contextActive && (
        <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-amber-400">
              Operational Context Active — {context.description ?? 'Dampener applied'}
            </p>
            <p className="text-[10px] text-amber-400/70 font-mono mt-0.5">
              Raw TCI × {0.2} dampener · {metrics.suppressedByContext} high-confidence threats downgraded to OPERATIONAL_SPIKE
            </p>
          </div>
        </div>
      )}

      {/* Footer legend */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">
          Legend:
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-[10px] text-slate-400">EDR × 1.5</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-500" />
          <span className="text-[10px] text-slate-400">IAM × 1.2</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-[10px] text-slate-400">SIEM × 1.0</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-[10px] text-slate-400">CSPM × 0.9</span>
        </span>
        <span className="ml-auto text-[10px] font-mono text-slate-500">
          Multi-source boost × 1.3 · Context dampener × 0.2
        </span>
      </div>
    </section>
  );
};

// ============================================================
// Small helper
// ============================================================
interface KpiCardProps {
  label: string;
  value: string;
  accent: string;
  icon: React.ElementType;
  sub?: string;
}

const KpiCard = memo<KpiCardProps>(({ label, value, accent, icon: Icon, sub }) => (
  <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
    <div className="flex items-center gap-2 mb-1">
      <Icon className={`w-3.5 h-3.5 ${accent}`} />
      <span className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">
        {label}
      </span>
    </div>
    <p className={`text-xl font-bold font-mono tabular-nums ${accent}`}>{value}</p>
    {sub && <p className="text-[9px] font-mono text-slate-600 mt-0.5">{sub}</p>}
  </div>
));
KpiCard.displayName = 'KpiCard';

export default TelemetryCorrelationGrid;