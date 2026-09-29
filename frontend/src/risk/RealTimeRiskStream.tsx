// frontend/src/risk/RealTimeRiskStream.tsx
// Live System Financial Risk ticker + telemetry event simulator.
import React, { memo, useCallback, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  Gauge,
  Wrench,
  Zap,
} from 'lucide-react';
import { useDeltaRisk } from './useDeltaRisk';
import type {
  AssetRiskInput,
  TelemetryEvent,
  TelemetryEventType,
} from './schema';

// ============================================================
// Hoisted formatters
// ============================================================
const fmtUsd = (n: number): string => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toFixed(0)}`;
};

const fmtDelta = (n: number): string => {
  const sign = n >= 0 ? '+' : '−';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${abs.toFixed(0)}`;
};

// ============================================================
// Demo portfolio — 6 assets, tuned so deltas are visibly large
// ============================================================
const DEMO_PORTFOLIO: readonly AssetRiskInput[] = Object.freeze([
  {
    assetId: 'srv-db-01',
    downtimeHours: 8,
    hourlyRevenueLoss: 120_000,
    recordsExposed: 12_000,
    costPerRecord: 250,
    epssScore: 0.35,
    assetExposureMultiplier: 1.8,
    annualThreatAttempts: 14,
  },
  {
    assetId: 'srv-pay-02',
    downtimeHours: 6,
    hourlyRevenueLoss: 200_000,
    recordsExposed: 4_000,
    costPerRecord: 320,
    epssScore: 0.28,
    assetExposureMultiplier: 2.1,
    annualThreatAttempts: 11,
  },
  {
    assetId: 'srv-auth-01',
    downtimeHours: 4,
    hourlyRevenueLoss: 90_000,
    recordsExposed: 2_500,
    costPerRecord: 280,
    epssScore: 0.22,
    assetExposureMultiplier: 1.5,
    annualThreatAttempts: 9,
  },
  {
    assetId: 'srv-api-03',
    downtimeHours: 10,
    hourlyRevenueLoss: 65_000,
    recordsExposed: 8_000,
    costPerRecord: 210,
    epssScore: 0.42,
    assetExposureMultiplier: 1.7,
    annualThreatAttempts: 18,
  },
  {
    assetId: 'srv-cache-04',
    downtimeHours: 3,
    hourlyRevenueLoss: 40_000,
    recordsExposed: 500,
    costPerRecord: 180,
    epssScore: 0.18,
    assetExposureMultiplier: 1.2,
    annualThreatAttempts: 6,
  },
  {
    assetId: 'srv-ml-05',
    downtimeHours: 5,
    hourlyRevenueLoss: 150_000,
    recordsExposed: 3_000,
    costPerRecord: 290,
    epssScore: 0.55,
    assetExposureMultiplier: 2.3,
    annualThreatAttempts: 21,
  },
]);

// ============================================================
// Simulation buttons — pre-baked events for the demo
// ============================================================
interface SimButton {
  label: string;
  accent: string;
  buildEvent: (id: string) => TelemetryEvent;
}

const SIM_BUTTONS: readonly SimButton[] = Object.freeze([
  {
    label: 'Critical EPSS Spike on srv-db-01',
    accent: 'text-rose-400 border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20',
    buildEvent: (id) => ({
      id,
      assetId: 'srv-db-01',
      eventType: 'EPSS_UPDATE',
      newValue: 0.95,
      timestamp: new Date().toISOString(),
    }),
  },
  {
    label: 'Toggle Maintenance Mode on srv-pay-02',
    accent: 'text-amber-400 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20',
    buildEvent: (id) => ({
      id,
      assetId: 'srv-pay-02',
      eventType: 'MAINTENANCE_TOGGLE',
      newValue: true,
      timestamp: new Date().toISOString(),
    }),
  },
  {
    label: 'Downtime Spike on srv-api-03',
    accent: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20',
    buildEvent: (id) => ({
      id,
      assetId: 'srv-api-03',
      eventType: 'DOWNTIME_CHANGE',
      newValue: 24,
      timestamp: new Date().toISOString(),
    }),
  },
  {
    label: 'EPSS Drop on srv-ml-05',
    accent: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20',
    buildEvent: (id) => ({
      id,
      assetId: 'srv-ml-05',
      eventType: 'EPSS_UPDATE',
      newValue: 0.10,
      timestamp: new Date().toISOString(),
    }),
  },
]);

// ============================================================
// Sub-component: the big live ticker
// ============================================================
const SystemEalTicker = memo<{ totalEal: number; lastDelta: number }>(
  ({ totalEal, lastDelta }) => {
    const deltaPositive = lastDelta > 0.01;
    const deltaNegative = lastDelta < -0.01;

    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">
            System Financial Risk (Σ EAL)
          </span>
          <Gauge className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold font-mono tabular-nums text-cyan-400">
            {fmtUsd(totalEal)}
          </span>
          {!deltaPositive && !deltaNegative ? null : (
            <span
              className={`flex items-center gap-0.5 text-xs font-mono font-semibold ${
                deltaPositive ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {deltaPositive ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              {fmtDelta(lastDelta)}
            </span>
          )}
        </div>
      </div>
    );
  }
);
SystemEalTicker.displayName = 'SystemEalTicker';

// ============================================================
// Sub-component: performance badge
// ============================================================
const PerfBadge = memo<{ ms: number }>(({ ms }) => {
  const ok = ms < 5;
  const veryFast = ms < 1;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-mono font-semibold border ${
        ok
          ? veryFast
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
      }`}
    >
      <Clock className="w-3 h-3" />
      {ms.toFixed(3)} ms
      {ok && veryFast && ' ⚡'}
    </div>
  );
});
PerfBadge.displayName = 'PerfBadge';

// ============================================================
// Sub-component: one log row
// ============================================================
interface LogRowProps {
  event: TelemetryEvent;
  deltaEal: number;
  durationMs: number;
  systemEalAfter: number;
}

const EventLogRow = memo<LogRowProps>(
  ({ event, deltaEal, durationMs, systemEalAfter }) => {
    const positive = deltaEal > 0.01;
    const negative = deltaEal < -0.01;

    return (
      <div className="grid grid-cols-12 gap-2 items-center px-3 py-2 border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 transition-colors">
        <div className="col-span-2">
          <span className="text-[10px] font-mono uppercase tracking-wide text-slate-500">
            {event.eventType.replace(/_/g, ' ')}
          </span>
        </div>
        <div className="col-span-3">
          <span className="text-[11px] font-mono text-white">{event.assetId}</span>
        </div>
        <div className="col-span-2 text-right">
          <span
            className={`text-[11px] font-mono font-semibold ${
              positive ? 'text-rose-400' : negative ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            {fmtDelta(deltaEal)}
          </span>
        </div>
        <div className="col-span-2 text-right">
          <span className="text-[11px] font-mono text-cyan-400">
            {fmtUsd(systemEalAfter)}
          </span>
        </div>
        <div className="col-span-3 flex justify-end">
          <PerfBadge ms={durationMs} />
        </div>
      </div>
    );
  }
);
EventLogRow.displayName = 'EventLogRow';

// ============================================================
// Main component
// ============================================================
const RealTimeRiskStream: React.FC = () => {
  const { summary, eventLog, dispatchTelemetryEvent } = useDeltaRisk(
    DEMO_PORTFOLIO as AssetRiskInput[]
  );

  const lastDelta = eventLog.length > 0 ? eventLog[0].deltaEal : 0;

  const seqRef = React.useRef(0);
  const nextId = useCallback(() => {
    seqRef.current += 1;
    return `evt-${seqRef.current}-${Date.now()}`;
  }, []);

  const handleSimulate = useCallback(
    (btn: SimButton) => {
      dispatchTelemetryEvent(btn.buildEvent(nextId()));
    },
    [dispatchTelemetryEvent, nextId]
  );

  const avgDurationMs = useMemo(() => {
    if (eventLog.length === 0) return 0;
    const total = eventLog.reduce((sum, e) => sum + e.durationMs, 0);
    return total / eventLog.length;
  }, [eventLog]);

  return (
    <section
      className="bg-slate-950 border border-slate-800 rounded-xl p-4 lg:p-5 shadow-2xl"
      aria-labelledby="real-time-risk-stream-heading"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
            <Activity className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2
              id="real-time-risk-stream-heading"
              className="text-base lg:text-lg font-semibold text-white flex items-center gap-2"
            >
              Real-Time Risk Stream
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded animate-pulse">
                O(1) DELTA
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Event-driven recalculation · single-asset ΔEAL, no full-graph sweep
            </p>
          </div>
        </div>
        {eventLog.length > 0 && (
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">
              Avg Processing
            </p>
            <PerfBadge ms={avgDurationMs} />
          </div>
        )}
      </div>

      {/* Ticker + asset count */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <div className="md:col-span-2">
          <SystemEalTicker totalEal={summary.totalEal} lastDelta={lastDelta} />
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">
              Assets Tracked
            </span>
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-white tabular-nums">
              {summary.activeAssetCount}
            </span>
            <span className="text-xs text-slate-500 font-mono">in Map</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] font-mono">
            <span className="text-slate-500">Direct Loss</span>
            <span className="text-rose-400">{fmtUsd(summary.totalDirectLoss)}</span>
          </div>
        </div>
      </div>

      {/* Simulator buttons */}
      <div className="mb-5">
        <p className="text-[10px] uppercase tracking-wide text-slate-500 font-medium mb-2 flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3" />
          Simulate Telemetry Event
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {SIM_BUTTONS.map((btn) => (
            <button
              key={btn.label}
              onClick={() => handleSimulate(btn)}
              className={`text-left px-3 py-2.5 rounded-lg border text-[11px] font-medium transition-colors ${btn.accent}`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Event log */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-wide text-slate-500 font-medium flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            Delta Log · most recent first
          </p>
          <span className="text-[10px] font-mono text-slate-600">
            {eventLog.length} / 20
          </span>
        </div>

        {eventLog.length === 0 ? (
          <div className="border border-dashed border-slate-800 rounded-lg p-8 text-center">
            <Wrench className="w-8 h-8 text-slate-700 mx-auto mb-2" />
            <p className="text-sm text-slate-500">
              No events yet — click a simulation button above to fire a telemetry update
            </p>
          </div>
        ) : (
          <div className="border border-slate-800 rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-900 border-b border-slate-800 text-[10px] uppercase tracking-wide text-slate-500 font-medium">
              <div className="col-span-2">Event</div>
              <div className="col-span-3">Asset</div>
              <div className="col-span-2 text-right">ΔEAL</div>
              <div className="col-span-2 text-right">Σ EAL</div>
              <div className="col-span-3 text-right">Duration</div>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {eventLog.map((entry) => (
                <EventLogRow
                  key={entry.event.id}
                  event={entry.event}
                  deltaEal={entry.deltaEal}
                  durationMs={entry.durationMs}
                  systemEalAfter={entry.systemEalAfter}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default RealTimeRiskStream;