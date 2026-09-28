// EfficientFrontier.tsx
import React, { useState, useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Target,
  DollarSign,
  Percent,
  Award,
  ChevronUp,
  ChevronDown,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

// --- Interfaces ---
interface FrontierPoint {
  budget: number; // in $K
  riskReduction: number; // in $K
  label: string;
  type: 'current' | 'optimal';
}

interface ToolAllocation {
  id: string;
  name: string;
  category: 'SIEM' | 'EDR' | 'IAM' | 'DLP' | 'Cloud' | 'AI';
  cost: number; // annual $K
  riskMitigation: number; // percentage
  rosI: number; // Return on Security Investment %
  recommended: boolean;
  currentSpend: number; // current annual $K
}

// --- Mock Data ---
const FRONTIER_DATA: FrontierPoint[] = [
  { budget: 200, riskReduction: 180, label: 'Baseline', type: 'current' },
  { budget: 400, riskReduction: 420, label: 'Q1 2024', type: 'current' },
  { budget: 600, riskReduction: 580, label: 'Q2 2024', type: 'current' },
  { budget: 800, riskReduction: 690, label: 'Current', type: 'current' },
  { budget: 1000, riskReduction: 780, label: 'Q3 Plan', type: 'current' },
  { budget: 300, riskReduction: 380, label: 'Optimal L1', type: 'optimal' },
  { budget: 500, riskReduction: 620, label: 'Optimal L2', type: 'optimal' },
  { budget: 700, riskReduction: 810, label: 'Optimal L3', type: 'optimal' },
  { budget: 900, riskReduction: 950, label: 'Optimal L4', type: 'optimal' },
  { budget: 1100, riskReduction: 1040, label: 'Optimal L5', type: 'optimal' },
];

const TOOL_ALLOCATIONS: ToolAllocation[] = [
  {
    id: 't1',
    name: 'CrowdStrike Falcon EDR',
    category: 'EDR',
    cost: 285,
    riskMitigation: 34,
    rosI: 420,
    recommended: true,
    currentSpend: 285,
  },
  {
    id: 't2',
    name: 'Splunk Enterprise Security',
    category: 'SIEM',
    cost: 420,
    riskMitigation: 28,
    rosI: 310,
    recommended: true,
    currentSpend: 480,
  },
  {
    id: 't3',
    name: 'Okta Identity Cloud',
    category: 'IAM',
    cost: 180,
    riskMitigation: 22,
    rosI: 580,
    recommended: true,
    currentSpend: 150,
  },
  {
    id: 't4',
    name: 'Varonis DLP Suite',
    category: 'DLP',
    cost: 220,
    riskMitigation: 18,
    rosI: 265,
    recommended: false,
    currentSpend: 220,
  },
  {
    id: 't5',
    name: 'Wiz Cloud Security',
    category: 'Cloud',
    cost: 165,
    riskMitigation: 15,
    rosI: 480,
    recommended: true,
    currentSpend: 0,
  },
  {
    id: 't6',
    name: 'Darktrace AI Defense',
    category: 'AI',
    cost: 310,
    riskMitigation: 12,
    rosI: 180,
    recommended: false,
    currentSpend: 310,
  },
];

// --- Custom Tooltip ---
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: FrontierPoint }>;
}

const FrontierTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0].payload;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-2xl">
      <p className="text-xs font-semibold text-white mb-1">{point.label}</p>
      <div className="space-y-1">
        <p className="text-xs text-slate-400">
          Budget: <span className="text-blue-400 font-mono">${point.budget}K</span>
        </p>
        <p className="text-xs text-slate-400">
          Risk Reduction:{' '}
          <span className="text-emerald-400 font-mono">${point.riskReduction}K</span>
        </p>
      </div>
    </div>
  );
};

// --- Main Component ---
const EfficientFrontier: React.FC = () => {
  const [showOptimal, setShowOptimal] = useState(true);
  const [sortKey, setSortKey] = useState<keyof ToolAllocation>('rosI');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sortedTools = useMemo(() => {
    const sorted = [...TOOL_ALLOCATIONS].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDir === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
    return sorted;
  }, [sortKey, sortDir]);

  const handleSort = (key: keyof ToolAllocation) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const currentPoints = FRONTIER_DATA.filter((d) => d.type === 'current');
  const optimalPoints = FRONTIER_DATA.filter((d) => d.type === 'optimal');

  // Calculate efficiency gains
  const currentMax = currentPoints[currentPoints.length - 1];
  const optimalAtSameBudget = optimalPoints.reduce((prev, curr) =>
    Math.abs(curr.budget - currentMax.budget) < Math.abs(prev.budget - currentMax.budget)
      ? curr
      : prev
  );
  const efficiencyGain = (
    ((optimalAtSameBudget.riskReduction - currentMax.riskReduction) / currentMax.riskReduction) *
    100
  ).toFixed(1);

  const totalCost = sortedTools.filter((t) => t.recommended).reduce((a, b) => a + b.cost, 0);
  const totalCurrentSpend = sortedTools.reduce((a, b) => a + b.currentSpend, 0);
  const totalRiskMitigation = sortedTools
    .filter((t) => t.recommended)
    .reduce((a, b) => a + b.riskMitigation, 0);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <Target className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Capital Efficiency Frontier</h2>
            <p className="text-xs text-slate-400">
              ILP-optimized security tool allocation (PuLP solver)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Sparkles className="w-3 h-3" />
            +{efficiencyGain}% efficiency
          </span>
        </div>
      </div>

      {/* Frontier Chart */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-medium text-white">Efficient Frontier Analysis</h3>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-slate-400">Current Trajectory</span>
              </div>
              {showOptimal && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="text-slate-400">Optimal Allocation</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowOptimal(!showOptimal)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors border ${
              showOptimal
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {showOptimal ? 'Hide' : 'Show'} Optimal
          </button>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                type="number"
                dataKey="budget"
                name="Budget"
                unit="K"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                label={{
                  value: 'Security Budget ($K)',
                  position: 'insideBottom',
                  offset: -10,
                  fill: '#64748b',
                  fontSize: 11,
                }}
              />
              <YAxis
                type="number"
                dataKey="riskReduction"
                name="Risk Reduction"
                unit="K"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                label={{
                  value: 'Risk Reduction ($K)',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#64748b',
                  fontSize: 11,
                }}
              />
              <ZAxis type="number" range={[60, 60]} />
              <Tooltip content={<FrontierTooltip />} />

              {/* Current Trajectory */}
              <Scatter
                name="Current"
                data={currentPoints}
                fill="#3b82f6"
                line={{ stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5 5' }}
                lineType="joint"
                shape="circle"
              />

              {/* Optimal Trajectory */}
              {showOptimal && (
                <Scatter
                  name="Optimal"
                  data={optimalPoints}
                  fill="#34d399"
                  line={{ stroke: '#34d399', strokeWidth: 2 }}
                  lineType="joint"
                  shape="diamond"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Allocation Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-medium text-white">PuLP Recommended Allocation</h3>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-slate-500">Recommended Budget: </span>
              <span className="text-white font-semibold">${totalCost}K</span>
            </div>
            <div>
              <span className="text-slate-500">Current: </span>
              <span className="text-slate-300 font-semibold">${totalCurrentSpend}K</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 border-b border-slate-800">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-400">
                  Tool
                </th>
                <th
                  className="text-right px-4 py-2.5 text-xs font-medium text-slate-400 cursor-pointer hover:text-white"
                  onClick={() => handleSort('cost')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Cost ($K)
                    {sortKey === 'cost' &&
                      (sortDir === 'asc' ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      ))}
                  </div>
                </th>
                <th
                  className="text-right px-4 py-2.5 text-xs font-medium text-slate-400 cursor-pointer hover:text-white"
                  onClick={() => handleSort('riskMitigation')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Risk Mitigation
                    {sortKey === 'riskMitigation' &&
                      (sortDir === 'asc' ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      ))}
                  </div>
                </th>
                <th
                  className="text-right px-4 py-2.5 text-xs font-medium text-slate-400 cursor-pointer hover:text-white"
                  onClick={() => handleSort('rosI')}
                >
                  <div className="flex items-center justify-end gap-1">
                    ROSI %
                    {sortKey === 'rosI' &&
                      (sortDir === 'asc' ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      ))}
                  </div>
                </th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-slate-400">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedTools.map((tool) => (
                <tr
                  key={tool.id}
                  className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          tool.recommended ? 'bg-emerald-400' : 'bg-slate-600'
                        }`}
                      />
                      <div>
                        <p className="text-sm text-white font-medium">{tool.name}</p>
                        <p className="text-xs text-slate-500">{tool.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-white font-mono text-sm">${tool.cost}K</span>
                      {tool.currentSpend !== tool.cost && (
                        <span
                          className={`text-xs ${
                            tool.currentSpend > tool.cost ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {tool.currentSpend > tool.cost ? '+' : '-'}$
                          {Math.abs(tool.currentSpend - tool.cost)}K
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-slate-800 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-amber-500"
                          style={{ width: `${(tool.riskMitigation / 40) * 100}%` }}
                        />
                      </div>
                      <span className="text-white font-mono text-sm w-8">
                        {tool.riskMitigation}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`font-mono text-sm font-semibold ${
                        tool.rosI > 400
                          ? 'text-emerald-400'
                          : tool.rosI > 250
                          ? 'text-amber-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {tool.rosI}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {tool.recommended ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <TrendingUp className="w-3 h-3" />
                        Keep
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        Cut
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/50 grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-slate-500">Recommended Tools</p>
            <p className="text-sm font-semibold text-emerald-400">
              {sortedTools.filter((t) => t.recommended).length} of {sortedTools.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Total Risk Mitigation</p>
            <p className="text-sm font-semibold text-amber-400">{totalRiskMitigation}%</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Budget Optimization</p>
            <p className="text-sm font-semibold text-white">
              ${Math.abs(totalCurrentSpend - totalCost)}K saved
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EfficientFrontier;