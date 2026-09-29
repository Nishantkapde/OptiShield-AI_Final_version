// TelemetryGrid.tsx
import React, { useState, memo, useMemo, useCallback } from 'react';
import {
  Activity,
  Shield,
  Key,
  Database,
  Cloud,
  Network,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Clock,
  Zap,
  Wrench,
} from 'lucide-react';
import { useAssets } from '../hooks/useAssets';
import type {
  AssetWithAssessment,
  AssetFeedType,
  AssetDisplayStatus,
} from '../lib/api/riskClient';

// ============================================================
// Feed type → icon + accent color
// ============================================================
const TYPE_ICON: Record<AssetFeedType, React.ElementType> = {
  SIEM: Activity,
  EDR: Shield,
  IAM: Key,
  Cloud: Cloud,
  Network: Network,
  DB: Database,
};

const TYPE_COLOR: Record<AssetFeedType, string> = {
  SIEM: '#3b82f6',
  EDR: '#10b981',
  IAM: '#f59e0b',
  Cloud: '#8b5cf6',
  Network: '#ef4444',
  DB: '#06b6d4',
};

// ============================================================
// Sub-component: Status badge
// ============================================================
const StatusBadge = memo<{ status: AssetDisplayStatus }>(({ status }) => {
  const config = {
    healthy: {
      icon: CheckCircle2,
      label: 'Healthy',
      classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
    degraded: {
      icon: AlertCircle,
      label: 'Degraded',
      classes: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    },
    down: {
      icon: XCircle,
      label: 'Down',
      classes: 'bg-red-500/10 text-red-400 border-red-500/20',
    },
    maintenance: {
      icon: Wrench,
      label: 'Maintenance',
      classes: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    },
  };
  const { icon: Icon, label, classes } = config[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${classes}`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
});
StatusBadge.displayName = 'StatusBadge';

// ============================================================
// Sub-component: Asset card
// ============================================================
interface AssetCardProps {
  asset: AssetWithAssessment;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

const AssetCard = memo<AssetCardProps>(({ asset, isSelected, onToggle }) => {
  const Icon = TYPE_ICON[asset.type];
  const color = TYPE_COLOR[asset.type];
  const isMaint = asset.status === 'maintenance';

  return (
    <button
      onClick={() => onToggle(asset.assetId)}
      className={`text-left rounded-lg border p-4 transition-all duration-200 ${
        isSelected
          ? 'border-blue-500/50 bg-blue-500/5 shadow-lg shadow-blue-500/10'
          : isMaint
          ? 'border-amber-500/30 bg-slate-800/30 opacity-80 hover:opacity-100'
          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-lg"
            style={{
              backgroundColor: `${color}15`,
              border: `1px solid ${color}30`,
            }}
          >
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <div>
            <p className="text-sm font-medium text-white">{asset.name}</p>
            <p className="text-xs text-slate-500">{asset.type}</p>
          </div>
        </div>
        <StatusBadge status={asset.status} />
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Zap className="w-3 h-3" /> Events/s
          </p>
          <p
            className={`text-sm font-semibold ${
              isMaint ? 'text-amber-400' : 'text-white'
            }`}
          >
            {isMaint ? 'Suppressed' : asset.eventsPerSec.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Last event
          </p>
          <p className="text-sm font-semibold text-white">{asset.lastEvent}</p>
        </div>
      </div>

      {/* Coverage bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-500">Coverage</span>
          <span
            className={`text-xs font-medium ${
              isMaint ? 'text-amber-400' : 'text-slate-300'
            }`}
          >
            {isMaint ? 'Suppressed' : `${asset.coverage}%`}
          </span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full transition-all duration-500"
            style={{
              width: `${isMaint ? 0 : asset.coverage}%`,
              backgroundColor:
                asset.coverage > 80
                  ? '#10b981'
                  : asset.coverage > 50
                  ? '#f59e0b'
                  : '#ef4444',
            }}
          />
        </div>
      </div>

      {/* Expanded detail — shows live Pain Point 1 output */}
      {isSelected && (
        <div className="mt-4 pt-3 border-t border-slate-700 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Source</span>
            <span className="text-xs text-slate-300 font-mono truncate max-w-[160px]">
              {asset.source}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Status</span>
            <StatusBadge status={asset.status} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">EAL</span>
            <span
              className={`text-xs font-mono ${
                isMaint ? 'text-amber-400' : 'text-rose-400'
              }`}
            >
              {isMaint
                ? '$0.00'
                : `$${asset.assessment.annualizedLossExpectancyEal.toLocaleString()}`}
            </span>
          </div>
          {isMaint && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Change Ticket</span>
                <span className="text-xs text-amber-400 font-mono">
                  {asset.assessment.changeTicketId ?? '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Planned Cost</span>
                <span className="text-xs text-amber-400 font-mono">
                  ${asset.assessment.plannedOperationalCost.toLocaleString()}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </button>
  );
});
AssetCard.displayName = 'AssetCard';

// ============================================================
// Main component
// ============================================================
const TelemetryGrid: React.FC = () => {
  const [selectedFeed, setSelectedFeed] = useState<string | null>(null);
  const { data, loading, error, refresh, lastUpdated } = useAssets();

  const handleToggle = useCallback((id: string) => {
    setSelectedFeed((prev) => (prev === id ? null : id));
  }, []);

  // Single-pass aggregate — excludes maintenance assets
  const { healthyCount, maintenanceCount, totalEvents, avgCoverage } = useMemo(() => {
    if (!data) {
      return { healthyCount: 0, maintenanceCount: 0, totalEvents: 0, avgCoverage: 0 };
    }
    let healthy = 0;
    let maintenance = 0;
    let events = 0;
    let covSum = 0;
    let covN = 0;

    for (const a of data.assets) {
      if (a.status === 'maintenance') {
        maintenance++;
        continue;
      }
      if (a.status === 'healthy') healthy++;
      events += a.eventsPerSec;
      covSum += a.coverage;
      covN++;
    }

    return {
      healthyCount: healthy,
      maintenanceCount: maintenance,
      totalEvents: events,
      avgCoverage: covN > 0 ? Math.round(covSum / covN) : 0,
    };
  }, [data]);

  const lastUpdatedLabel = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString()
    : '—';

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              Telemetry Feeds
              {loading && (
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded animate-pulse">
                  Syncing…
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              {data
                ? `${healthyCount}/${data.assets.length - maintenanceCount} sources healthy · ${maintenanceCount} in maintenance · ${totalEvents.toLocaleString()} events/s · updated ${lastUpdatedLabel}`
                : 'Loading telemetry…'}
            </p>
          </div>
        </div>
        <button
          onClick={refresh}
          className="p-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-600 transition-colors"
          aria-label="Refresh telemetry"
        >
          <RefreshCw
            className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`}
          />
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 px-3 py-2 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-400">
          Failed to reach backend: {error.message}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.assets.map((asset) => (
          <AssetCard
            key={asset.assetId}
            asset={asset}
            isSelected={selectedFeed === asset.assetId}
            onToggle={handleToggle}
          />
        ))}
      </div>

      {/* Aggregate footer */}
      <div className="mt-6 pt-4 border-t border-slate-700 grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-xs text-slate-500">Total Throughput</p>
          <p className="text-lg font-bold text-white">
            {totalEvents.toLocaleString()} evt/s
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500">Avg Coverage</p>
          <p className="text-lg font-bold text-emerald-400">{avgCoverage}%</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500">Active Sources</p>
          <p className="text-lg font-bold text-blue-400">
            {healthyCount}/{data ? data.assets.length - maintenanceCount : 0}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TelemetryGrid;