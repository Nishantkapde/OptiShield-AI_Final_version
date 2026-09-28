// TelemetryGrid.tsx
import React, { useState } from 'react';
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
} from 'lucide-react';

// --- Mock Data ---
interface TelemetryFeed {
  id: string;
  name: string;
  type: 'SIEM' | 'EDR' | 'IAM' | 'Cloud' | 'Network' | 'DB';
  status: 'healthy' | 'degraded' | 'down';
  eventsPerSec: number;
  lastEvent: string;
  coverage: number;
  icon: React.ElementType;
  color: string;
  source: string;
}

const FEEDS: TelemetryFeed[] = [
  {
    id: 'siem-1',
    name: 'Splunk Enterprise',
    type: 'SIEM',
    status: 'healthy',
    eventsPerSec: 4520,
    lastEvent: '2s ago',
    coverage: 98,
    icon: Activity,
    color: '#3b82f6',
    source: 'splunk.corp.optishield.io',
  },
  {
    id: 'edr-1',
    name: 'CrowdStrike Falcon',
    type: 'EDR',
    status: 'healthy',
    eventsPerSec: 2180,
    lastEvent: '1s ago',
    coverage: 99,
    icon: Shield,
    color: '#10b981',
    source: 'falcon.crowdstrike.com',
  },
  {
    id: 'iam-1',
    name: 'Okta Identity Cloud',
    type: 'IAM',
    status: 'degraded',
    eventsPerSec: 890,
    lastEvent: '45s ago',
    coverage: 72,
    icon: Key,
    color: '#f59e0b',
    source: 'optishield.okta.com',
  },
  {
    id: 'cloud-1',
    name: 'AWS CloudTrail',
    type: 'Cloud',
    status: 'healthy',
    eventsPerSec: 3200,
    lastEvent: '3s ago',
    coverage: 95,
    icon: Cloud,
    color: '#8b5cf6',
    source: 'cloudtrail.us-east-1.amazonaws.com',
  },
  {
    id: 'net-1',
    name: 'Palo Alto Firewall',
    type: 'Network',
    status: 'down',
    eventsPerSec: 0,
    lastEvent: '12m ago',
    coverage: 0,
    icon: Network,
    color: '#ef4444',
    source: 'panorama.corp.optishield.io',
  },
  {
    id: 'db-1',
    name: 'PostgreSQL Audit',
    type: 'DB',
    status: 'healthy',
    eventsPerSec: 450,
    lastEvent: '5s ago',
    coverage: 88,
    icon: Database,
    color: '#06b6d4',
    source: 'audit.db.internal',
  },
];

const StatusBadge: React.FC<{ status: TelemetryFeed['status'] }> = ({ status }) => {
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
  };
  const { icon: Icon, label, classes } = config[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${classes}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
};

const TelemetryGrid: React.FC = () => {
  const [selectedFeed, setSelectedFeed] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const healthyCount = FEEDS.filter((f) => f.status === 'healthy').length;
  const totalEvents = FEEDS.reduce((a, b) => a + b.eventsPerSec, 0);

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Telemetry Feeds</h2>
            <p className="text-xs text-slate-400">
              {healthyCount}/{FEEDS.length} sources healthy · {totalEvents.toLocaleString()} events/s
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="p-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-600 transition-colors"
          aria-label="Refresh telemetry"
        >
          <RefreshCw
            className={`w-4 h-4 text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`}
          />
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEEDS.map((feed) => {
          const Icon = feed.icon;
          const isSelected = selectedFeed === feed.id;

          return (
            <button
              key={feed.id}
              onClick={() => setSelectedFeed(isSelected ? null : feed.id)}
              className={`text-left rounded-lg border p-4 transition-all duration-200 ${
                isSelected
                  ? 'border-blue-500/50 bg-blue-500/5 shadow-lg shadow-blue-500/10'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${feed.color}15`, border: `1px solid ${feed.color}30` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: feed.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{feed.name}</p>
                    <p className="text-xs text-slate-500">{feed.type}</p>
                  </div>
                </div>
                <StatusBadge status={feed.status} />
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Events/s
                  </p>
                  <p className="text-sm font-semibold text-white">
                    {feed.eventsPerSec.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Last event
                  </p>
                  <p className="text-sm font-semibold text-white">{feed.lastEvent}</p>
                </div>
              </div>

              {/* Coverage Bar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500">Coverage</span>
                  <span className="text-xs font-medium text-slate-300">{feed.coverage}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${feed.coverage}%`,
                      backgroundColor:
                        feed.coverage > 80
                          ? '#10b981'
                          : feed.coverage > 50
                          ? '#f59e0b'
                          : '#ef4444',
                    }}
                  />
                </div>
              </div>

              {/* Expanded Detail */}
              {isSelected && (
                <div className="mt-4 pt-3 border-t border-slate-700 space-y-2 animate-in slide-in-from-top-1 duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Source</span>
                    <span className="text-xs text-slate-300 font-mono">{feed.source}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Status</span>
                    <StatusBadge status={feed.status} />
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Aggregate Footer */}
      <div className="mt-6 pt-4 border-t border-slate-700 grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-xs text-slate-500">Total Throughput</p>
          <p className="text-lg font-bold text-white">{totalEvents.toLocaleString()} evt/s</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500">Avg Coverage</p>
          <p className="text-lg font-bold text-emerald-400">
            {Math.round(FEEDS.reduce((a, b) => a + b.coverage, 0) / FEEDS.length)}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500">Active Sources</p>
          <p className="text-lg font-bold text-blue-400">{healthyCount}/{FEEDS.length}</p>
        </div>
      </div>
    </div>
  );
};

export default TelemetryGrid;