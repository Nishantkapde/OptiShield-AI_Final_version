// src/components/ShadowITAlert.tsx
import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Eye,
  Shield,
  X,
  ExternalLink,
  Server,
  Cloud,
  Smartphone,
  Globe,
  Lock,
  Unlock,
  RefreshCw,
} from 'lucide-react';

interface UnmappedAsset {
  id: string;
  ip: string;
  type: string;
  source: string;
  riskMultiplier: number;
}

// --- Mock Data ---
interface ShadowITAsset {
  id: string;
  name: string;
  category: 'Cloud Storage' | 'SaaS' | 'DevOps' | 'Comms' | 'AI/ML';
  riskLevel: 'critical' | 'high' | 'medium';
  discovered: string;
  users: number;
  dataExposure: string;
  icon: React.ElementType;
  compliance: string[];
  description: string;
}
const SHADOW_ASSETS: ShadowITAsset[] = [
  {
    id: 's1',
    name: 'Dropbox Business',
    category: 'Cloud Storage',
    riskLevel: 'critical',
    discovered: '2h ago',
    users: 34,
    dataExposure: 'PII + Financial',
    icon: Cloud,
    compliance: ['GDPR', 'SOC2'],
    description:
      'Unsactioned file sharing across finance and HR departments. No DLP coverage detected.',
  },
  {
    id: 's2',
    name: 'OpenAI ChatGPT API',
    category: 'AI/ML',
    riskLevel: 'high',
    discovered: '5h ago',
    users: 12,
    dataExposure: 'Source Code + IP',
    icon: Globe,
    compliance: ['IP Risk'],
    description:
      'Engineering team routing proprietary code to external LLM endpoints without review.',
  },
  {
    id: 's3',
    name: 'Trello (Personal)',
    category: 'DevOps',
    riskLevel: 'medium',
    discovered: '1d ago',
    users: 8,
    dataExposure: 'Project Metadata',
    icon: Server,
    compliance: ['SOC2'],
    description:
      'Personal Trello boards used for sprint planning. No SSO integration or audit logs.',
  },
  {
    id: 's4',
    name: 'Telegram Desktop',
    category: 'Comms',
    riskLevel: 'high',
    discovered: '3d ago',
    users: 22,
    dataExposure: 'Internal Comms',
    icon: Smartphone,
    compliance: ['GDPR'],
    description:
      'E2E encrypted messaging bypassing corporate DLP. Sensitive discussions unmonitored.',
  },
];

const RISK_CONFIG = {
  critical: {
    label: 'Critical',
    classes: 'bg-red-500/10 text-red-400 border-red-500/30',
    barColor: '#ef4444',
  },
  high: {
    label: 'High',
    classes: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    barColor: '#f59e0b',
  },
  medium: {
    label: 'Medium',
    classes: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    barColor: '#eab308',
  },
};

export const ShadowITAlert: React.FC = () => {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  
  // Pain Point 11: Backend Discrepancy & Penalty State
  const [penaltyData, setPenaltyData] = useState<{
    unmappedCount: number;
    unmappedEntities: UnmappedAsset[];
    penaltyMultiplier: number;
    recommendation: string;
  } | null>(null);
  const [loadingPenalty, setLoadingPenalty] = useState(false);

  const fetchShadowPenalties = async () => {
    setLoadingPenalty(true);
    try {
      const res = await fetch('http://localhost:5001/api/shadow-assets/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setPenaltyData(data);
      }
    } catch (err) {
      console.error('Failed to fetch shadow asset penalty data', err);
    } finally {
      setLoadingPenalty(false);
    }
  };

  useEffect(() => {
    fetchShadowPenalties();
  }, []);

  const visibleAssets = SHADOW_ASSETS.filter((a) => !dismissed.includes(a.id));

  const handleDismiss = (id: string) => {
    setDismissed((prev) => [...prev, id]);
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
            <Eye className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Shadow IT & Unmapped Assets</h2>
            <p className="text-xs text-slate-400">
              {visibleAssets.length} unsanctioned asset{visibleAssets.length !== 1 ? 's' : ''} detected
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchShadowPenalties}
            disabled={loadingPenalty}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-slate-300 transition-colors flex items-center gap-1.5 text-xs"
            title="Re-run Discrepancy Scan"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingPenalty ? 'animate-spin' : ''}`} />
            <span>Sync CMDB</span>
          </button>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 rounded-full border border-red-500/20">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            <span className="text-xs font-medium text-red-400">Requires Review</span>
          </div>
        </div>
      </div>

      {/* Pain Point 11: Dynamic Risk Penalty Banner */}
      {penaltyData && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono text-amber-400 block">Pain Point 11 Active Penalty</span>
            <p className="text-xs text-slate-300 mt-0.5">{penaltyData.recommendation}</p>
          </div>
          <div className="text-right shrink-0 pl-3">
            <span className="text-[10px] text-slate-400 block font-mono">Risk Multiplier</span>
            <span className="text-lg font-mono font-bold text-rose-400">{penaltyData.penaltyMultiplier}x</span>
          </div>
        </div>
      )}

      {visibleAssets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="p-3 bg-emerald-500/10 rounded-full border border-emerald-500/20 mb-3">
            <Shield className="w-6 h-6 text-emerald-400" />
          </div>
          <p className="text-sm font-medium text-white">No Shadow IT Detected</p>
          <p className="text-xs text-slate-400 mt-1">All alerts have been reviewed</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleAssets.map((asset) => {
            const Icon = asset.icon;
            const risk = RISK_CONFIG[asset.riskLevel];
            const isExpanded = expanded === asset.id;

            return (
              <div
                key={asset.id}
                className={`rounded-lg border transition-all duration-200 ${
                  isExpanded
                    ? 'border-red-500/30 bg-red-500/5'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          asset.riskLevel === 'critical'
                            ? 'bg-red-500/10'
                            : asset.riskLevel === 'high'
                            ? 'bg-amber-500/10'
                            : 'bg-yellow-500/10'
                        }`}
                      >
                        <Icon
                          className="w-4 h-4"
                          style={{ color: risk.barColor }}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{asset.name}</p>
                        <p className="text-xs text-slate-500">{asset.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium border ${risk.classes}`}
                      >
                        {risk.label}
                      </span>
                      <button
                        onClick={() => handleDismiss(asset.id)}
                        className="p-1 rounded hover:bg-slate-700 transition-colors"
                        aria-label="Dismiss alert"
                      >
                        <X className="w-3.5 h-3.5 text-slate-500" />
                      </button>
                    </div>
                  </div>

                  {/* Risk Bar */}
                  <div className="w-full bg-slate-700 rounded-full h-1 mb-3">
                    <div
                      className="h-1 rounded-full"
                      style={{
                        width:
                          asset.riskLevel === 'critical'
                            ? '100%'
                            : asset.riskLevel === 'high'
                            ? '70%'
                            : '40%',
                        backgroundColor: risk.barColor,
                      }}
                    />
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-slate-500">Users</p>
                      <p className="text-sm font-semibold text-white">{asset.users}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Discovered</p>
                      <p className="text-sm font-semibold text-white">{asset.discovered}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Data at Risk</p>
                      <p className="text-sm font-semibold text-white truncate">{asset.dataExposure}</p>
                    </div>
                  </div>

                  {/* Expand Toggle */}
                  <button
                    onClick={() => setExpanded(isExpanded ? null : asset.id)}
                    className="mt-3 text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                  >
                    {isExpanded ? 'Hide details' : 'View details'}
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-slate-700/50 animate-in slide-in-from-top-1 duration-150">
                    <div className="mt-3 space-y-3">
                      <p className="text-xs text-slate-400 leading-relaxed">{asset.description}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-slate-500">Compliance:</span>
                        {asset.compliance.map((c) => (
                          <span
                            key={c}
                            className="px-2 py-0.5 rounded text-xs bg-slate-700/50 text-slate-300 border border-slate-600"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        {asset.riskLevel === 'critical' ? (
                          <div className="flex items-center gap-1.5 text-xs text-red-400">
                            <Unlock className="w-3 h-3" />
                            <span>Unencrypted external access detected</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                            <Lock className="w-3 h-3" />
                            <span>Encrypted but unauthorized</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Actions */}
      <div className="mt-6 pt-4 border-t border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs text-slate-500">
            {SHADOW_ASSETS.length - visibleAssets.length} dismissed
          </span>
        </div>
        <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium">
          View all in Asset Inventory →
        </button>
      </div>
    </div>
  );
};

export default ShadowITAlert;