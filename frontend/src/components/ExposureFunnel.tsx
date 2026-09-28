// ExposureFunnel.tsx
import React, { useState } from 'react';
import { Filter, DollarSign, Shield, AlertTriangle, ChevronRight, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// --- Mock Data ---
const STAGES = [
  { id: 'ingested', label: 'Total Ingested Alerts', value: 12450, color: '#3b82f6' },
  { id: 'epss', label: 'EPSS Gate (< 0.10)', value: 8300, color: '#f59e0b' },
  { id: 'criticality', label: 'Business Criticality Scaling', value: 4200, color: '#ef4444' },
  { id: 'ale', label: 'Top Monetary Asset Priority (ALE $)', value: 1250, color: '#8b5cf6' },
];

const ALE_DATA = [
  { name: 'Customer DB', ale: 4200000, color: '#8b5cf6' },
  { name: 'Payment Gateway', ale: 3100000, color: '#a78bfa' },
  { name: 'Auth Service', ale: 2800000, color: '#c4b5fd' },
  { name: 'Internal Wiki', ale: 1200000, color: '#ddd6fe' },
  { name: 'Marketing Site', ale: 850000, color: '#ede9fe' },
];

const ExposureFunnel: React.FC = () => {
  const [activeStage, setActiveStage] = useState<string | null>(null);

  const handleStageClick = (stageId: string) => {
    setActiveStage(activeStage === stageId ? null : stageId);
  };

  // Calculate conversion percentages
  const getConversion = (index: number) => {
    if (index === 0) return 100;
    const prev = STAGES[index - 1].value;
    const curr = STAGES[index].value;
    return ((curr / prev) * 100).toFixed(1);
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <Filter className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Exposure Funnel</h2>
            <p className="text-xs text-slate-400">Threat prioritization pipeline</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Click stages to filter</span>
        </div>
      </div>

      {/* Funnel Stages */}
      <div className="space-y-3 mb-6">
        {STAGES.map((stage, index) => {
          const isActive = activeStage === stage.id;
          const isLast = index === STAGES.length - 1;

          return (
            <React.Fragment key={stage.id}>
              <button
                onClick={() => handleStageClick(stage.id)}
                className={`w-full text-left transition-all duration-200 ${
                  isActive ? 'scale-[1.02]' : 'hover:scale-[1.01]'
                }`}
              >
                <div
                  className={`relative overflow-hidden rounded-lg border p-4 transition-all duration-200 ${
                    isActive
                      ? 'border-blue-500/50 bg-blue-500/5 shadow-lg shadow-blue-500/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                          isActive ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{stage.label}</p>
                        <p className="text-xs text-slate-400">
                          {stage.value.toLocaleString()} alerts
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {index > 0 && (
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Conversion</p>
                          <p
                            className={`text-sm font-semibold ${
                              Number(getConversion(index)) < 50
                                ? 'text-red-400'
                                : Number(getConversion(index)) < 75
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }`}
                          >
                            {getConversion(index)}%
                          </p>
                        </div>
                      )}
                      <ChevronRight
                        className={`w-4 h-4 transition-transform ${
                          isActive ? 'rotate-90 text-blue-400' : 'text-slate-600'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Progress bar background */}
                  <div className="absolute bottom-0 left-0 h-0.5 bg-slate-700 w-full">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${(stage.value / STAGES[0].value) * 100}%`,
                        backgroundColor: stage.color,
                      }}
                    />
                  </div>
                </div>
              </button>

              {/* Active Stage Detail Panel */}
              {isActive && (
                <div className="ml-4 pl-4 border-l-2 border-blue-500/30 animate-in slide-in-from-top-2 duration-200">
                  <div className="bg-slate-800/80 rounded-lg p-4 border border-slate-700">
                    {stage.id === 'ingested' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-amber-400">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-xs font-medium">Raw Alert Volume</span>
                        </div>
                        <p className="text-xs text-slate-400">
                          All alerts from SIEM, EDR, and IAM feeds. High noise ratio expected.
                        </p>
                        <div className="grid grid-cols-3 gap-2 mt-3">
                          {['SIEM', 'EDR', 'IAM'].map((src) => (
                            <div key={src} className="bg-slate-900 rounded p-2 text-center">
                              <p className="text-xs text-slate-500">{src}</p>
                              <p className="text-sm font-semibold text-white">
                                {Math.floor(stage.value / 3).toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {stage.id === 'epss' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-amber-400">
                          <Shield className="w-4 h-4" />
                          <span className="text-xs font-medium">EPSS Hard Filter</span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Alerts with EPSS score &lt; 0.10 are discarded. Focus on exploitable threats.
                        </p>
                        <div className="flex items-center gap-2 mt-3">
                          <div className="flex-1 bg-slate-900 rounded-full h-2">
                            <div
                              className="bg-amber-500 h-2 rounded-full"
                              style={{ width: '66.7%' }}
                            />
                          </div>
                          <span className="text-xs text-slate-400">66.7% retained</span>
                        </div>
                      </div>
                    )}

                    {stage.id === 'criticality' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-red-400">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-xs font-medium">Business Criticality Scaling</span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Alerts weighted by asset criticality tier. Tier 1 assets escalate.
                        </p>
                        <div className="space-y-1.5 mt-3">
                          {[
                            { tier: 'Tier 1 (Critical)', pct: 45, color: '#ef4444' },
                            { tier: 'Tier 2 (Important)', pct: 35, color: '#f59e0b' },
                            { tier: 'Tier 3 (Standard)', pct: 20, color: '#3b82f6' },
                          ].map((t) => (
                            <div key={t.tier} className="flex items-center gap-2">
                              <span className="text-xs text-slate-400 w-32">{t.tier}</span>
                              <div className="flex-1 bg-slate-900 rounded-full h-1.5">
                                <div
                                  className="h-1.5 rounded-full"
                                  style={{ width: `${t.pct}%`, backgroundColor: t.color }}
                                />
                              </div>
                              <span className="text-xs text-slate-500 w-8 text-right">{t.pct}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {stage.id === 'ale' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-purple-400">
                          <DollarSign className="w-4 h-4" />
                          <span className="text-xs font-medium">
                            Annualized Loss Expectancy (ALE)
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mb-2">
                          Top monetary assets ranked by ALE. Remediation priority queue.
                        </p>
                        <div className="h-40">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={ALE_DATA} layout="vertical" margin={{ left: 0, right: 10 }}>
                              <XAxis type="number" hide />
                              <YAxis
                                type="category"
                                dataKey="name"
                                width={100}
                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: '#1e293b',
                                  border: '1px solid #334155',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                }}
                                formatter={(value) => [`$${(Number(value ?? 0) / 1000000).toFixed(1)}M`, 'ALE']}
                              />
                              <Bar dataKey="ale" radius={[0, 4, 4, 0]} barSize={16}>
                                {ALE_DATA.map((entry, idx) => (
                                  <Cell key={idx} fill={entry.color} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!isLast && !isActive && (
                <div className="flex items-center justify-center py-0.5">
                  <div className="w-px h-4 bg-slate-700" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Summary Footer */}
      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-700">
        <div className="text-center">
          <p className="text-xs text-slate-500">Noise Reduction</p>
          <p className="text-lg font-bold text-emerald-400">
            {((1 - STAGES[3].value / STAGES[0].value) * 100).toFixed(1)}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500">Final Queue</p>
          <p className="text-lg font-bold text-white">{STAGES[3].value.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500">Total ALE at Risk</p>
          <p className="text-lg font-bold text-purple-400">
            ${(ALE_DATA.reduce((a, b) => a + b.ale, 0) / 1000000).toFixed(1)}M
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExposureFunnel;