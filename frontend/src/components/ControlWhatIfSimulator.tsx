// src/components/ControlWhatIfSimulator.tsx
import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  memo,
} from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar,
} from 'recharts';
import {
  Sliders, Sparkles, Zap, Shield, ShieldAlert, Brain, Fingerprint,
  PowerOff, TrendingUp, TrendingDown, DollarSign, Activity, RotateCcw,
  Gauge, Target, Wand2, TrendingUp as TrendIcon,
} from 'lucide-react';

// ============================================================
// Types
// ============================================================

type ControlDomain = 'shadow-it' | 'presidio' | 'zero-trust' | 'circuit-breaker';
type PresetId = 'max-ai' | 'cost-optimized' | 'aggressive-compliance' | 'custom';

interface ControlDefinition {
  id: ControlDomain;
  name: string;
  shortName: string;
  description: string;
  icon: React.ElementType;
  accent: string;
  maxRiskReduction: number;
  costPerPoint: number;
  baselineCoverage: number;
}

interface PresetScenario {
  id: PresetId;
  name: string;
  description: string;
  icon: React.ElementType;
  coverage: Record<ControlDomain, number>;
  accent: string;
}

interface SimulationMetrics {
  annualBudget: number;       // $K
  totalExposure: number;      // $M
  riskIndex: number;          // 0-100
  rosI: number;               // %
  mitigationByDomain: Record<ControlDomain, number>;
}

interface ComparisonCard {
  id: string;
  label: string;
  icon: React.ElementType;
  baselineValue: number;
  simulatedValue: number;
  format: 'currency' | 'index' | 'percent';
  lowerIsBetter: boolean;
}

// ============================================================
// [FIX #1 & #3] Backend contract — keys and units are documented.
//               Monetary fields are in raw USD DOLLARS, not $M.
// ============================================================

interface BackendSimulationResponse {
  success: boolean;
  recommendation?: string;
  metrics?: {
    baselineEal?: number;   // dollars
    simulatedEal?: number;  // dollars
    baselineVar?: number;   // dollars
    simulatedVar?: number;  // dollars
    ealSavings?: number;    // dollars
    netRoi?: number;        // percent
  };
  trendForecast?: Array<{
    month: string;
    projectedEal: number;   // dollars
    projectedVar: number;   // dollars
  }>;
}

// ============================================================
// [FIX #2] Translate frontend domain IDs → backend controlImpacts keys.
// The backend's `/api/risk/simulate` recognises these 5 keys only:
//   mfa_privileged, zero_trust_segmentation, edr_deployment,
//   cloud_cspm, patch_automation
// ============================================================

const BACKEND_CONTROL_MAP: Record<ControlDomain, string> = {
  'shadow-it': 'cloud_cspm',
  'presidio': 'patch_automation',
  'zero-trust': 'zero_trust_segmentation',
  'circuit-breaker': 'edr_deployment',
};

// ============================================================
// [FIX #1] Corrected request body keys + AbortController support.
// ============================================================

const runRiskSimulation = async (
  selectedControls: string[],
  threatLevel: number,
  signal?: AbortSignal
): Promise<BackendSimulationResponse> => {
  const response = await fetch('/api/risk/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selectedControls, threatLevel }),
    signal,
  });
  if (!response.ok) {
    throw new Error(`Risk simulation failed: ${response.status}`);
  }
  return (await response.json()) as BackendSimulationResponse;
};

// ============================================================
// Mock Data — Control Definitions
// ============================================================

const CONTROLS: ControlDefinition[] = [
  {
    id: 'shadow-it',
    name: 'Shadow IT Remediation',
    shortName: 'Shadow IT',
    description: 'Discovery & enforcement of unsanctioned SaaS, cloud, and endpoint tools.',
    icon: ShieldAlert,
    accent: '#f59e0b',
    maxRiskReduction: 22,
    costPerPoint: 18,
    baselineCoverage: 42,
  },
  {
    id: 'presidio',
    name: 'LLM Presidio Sanitization',
    shortName: 'Presidio PII',
    description: 'Inline PII/PHI redaction for all LLM prompts and agent I/O streams.',
    icon: Brain,
    accent: '#06b6d4',
    maxRiskReduction: 26,
    costPerPoint: 22,
    baselineCoverage: 55,
  },
  {
    id: 'zero-trust',
    name: 'Zero Trust Identity',
    shortName: 'Zero Trust',
    description: 'Continuous verification, MFA, and least-privilege enforcement across identities.',
    icon: Fingerprint,
    accent: '#10b981',
    maxRiskReduction: 32,
    costPerPoint: 26,
    baselineCoverage: 68,
  },
  {
    id: 'circuit-breaker',
    name: 'Agentic Circuit Breakers',
    shortName: 'Circuit Breakers',
    description: 'Auto-isolation of compromised LLM agents before cascade propagation.',
    icon: PowerOff,
    accent: '#f43f5e',
    maxRiskReduction: 20,
    costPerPoint: 24,
    baselineCoverage: 35,
  },
];

// [FIX #7] Precompute baseline mitigation once (was recomputed per render).
const BASELINE_MITIGATION: Record<ControlDomain, number> = CONTROLS.reduce(
  (acc, ctrl) => {
    acc[ctrl.id] = (ctrl.baselineCoverage / 100) * ctrl.maxRiskReduction;
    return acc;
  },
  {} as Record<ControlDomain, number>
);

const PRESETS: PresetScenario[] = [
  {
    id: 'max-ai',
    name: 'Maximum AI Protection',
    description: 'Full AI-native controls; ignores cost efficiency.',
    icon: Sparkles,
    accent: '#06b6d4',
    coverage: { 'shadow-it': 80, presidio: 100, 'zero-trust': 85, 'circuit-breaker': 95 },
  },
  {
    id: 'cost-optimized',
    name: 'Cost-Optimized Baseline',
    description: 'Best ROSI per dollar spent across control domains.',
    icon: DollarSign,
    accent: '#10b981',
    coverage: { 'shadow-it': 55, presidio: 70, 'zero-trust': 75, 'circuit-breaker': 45 },
  },
  {
    id: 'aggressive-compliance',
    name: 'Aggressive Compliance',
    description: 'SEBI CSCRF hardening; maximizes audit posture.',
    icon: Shield,
    accent: '#f59e0b',
    coverage: { 'shadow-it': 90, presidio: 75, 'zero-trust': 100, 'circuit-breaker': 70 },
  },
];

const BASELINE_METRICS: SimulationMetrics = {
  annualBudget: 6_500,
  totalExposure: 48.5,
  riskIndex: 64,
  rosI: 0,
  mitigationByDomain: {
    'shadow-it': 42 * 0.22,
    presidio: 55 * 0.26,
    'zero-trust': 68 * 0.32,
    'circuit-breaker': 35 * 0.2,
  },
};

const MAX_EXPOSURE_REDUCTION = 0.85;

// ============================================================
// Calculation Engine
// ============================================================

const simulate = (
  coverage: Record<ControlDomain, number>,
  baseline: SimulationMetrics
): SimulationMetrics => {
  let totalMitigationPct = 0;
  let annualBudget = 0;
  const mitigationByDomain: Record<ControlDomain, number> = {
    'shadow-it': 0, presidio: 0, 'zero-trust': 0, 'circuit-breaker': 0,
  };

  for (const ctrl of CONTROLS) {
    const c = coverage[ctrl.id];
    const mitigation = (c / 100) * ctrl.maxRiskReduction;
    mitigationByDomain[ctrl.id] = mitigation;
    totalMitigationPct += mitigation;
    const efficiency = 1 + Math.pow(c / 100, 1.6);
    annualBudget += (c * ctrl.costPerPoint * efficiency) / 100;
  }

  const cappedMitigation = Math.min(totalMitigationPct, MAX_EXPOSURE_REDUCTION * 100);
  const totalExposure = baseline.totalExposure * (1 - cappedMitigation / 100);
  const riskIndex = Math.max(2, 100 * (1 - cappedMitigation / 100));

  const deltaBudget = annualBudget - baseline.annualBudget;
  const avoidedLoss = (baseline.totalExposure - totalExposure) * 1_000;
  const rosI =
    deltaBudget > 0 ? ((avoidedLoss - deltaBudget) / deltaBudget) * 100 : 0;

  return {
    annualBudget: Math.round(annualBudget),
    totalExposure: Number(totalExposure.toFixed(2)),
    riskIndex: Number(riskIndex.toFixed(1)),
    rosI: Number(rosI.toFixed(1)),
    mitigationByDomain,
  };
};

// ============================================================
// Formatting
// ============================================================

const formatMetric = (value: number, format: ComparisonCard['format']): string => {
  switch (format) {
    case 'currency': return `$${value.toFixed(2)}M`;
    case 'index':    return value.toFixed(1);
    case 'percent':  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  }
};

// ============================================================
// [FIX #6] Hoisted chart theme (was re-created every render)
// ============================================================

const CHART_THEME = {
  grid: '#1e293b',
  axis: '#64748b',
  tick: { fill: '#94a3b8', fontSize: 11 },
} as const;

// ============================================================
// [FIX #5] Memoized Tooltips
// ============================================================

interface ChartTooltipEntry { name: string; value: number; color: string; }
interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipEntry[];
  label?: string;
}

const BarTooltip = memo<ChartTooltipProps>(({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-950 border border-slate-700 rounded-lg p-3 shadow-2xl">
      <p className="text-xs font-semibold text-white mb-2">{label}</p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-4">
            <span className="text-[11px] text-slate-400">{entry.name}</span>
            <span className="text-[11px] font-mono font-semibold" style={{ color: entry.color }}>
              {entry.value.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});
BarTooltip.displayName = 'BarTooltip';

const RadarTooltip = memo<ChartTooltipProps>(({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-950 border border-slate-700 rounded-lg p-3 shadow-2xl">
      <p className="text-xs font-semibold text-white mb-2">{label}</p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-4">
            <span className="text-[11px] text-slate-400">{entry.name}</span>
            <span className="text-[11px] font-mono font-semibold" style={{ color: entry.color }}>
              {entry.value.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});
RadarTooltip.displayName = 'RadarTooltip';

// ============================================================
// [FIX #5] Memoized Comparison Card
// ============================================================

const ComparisonCardView = memo<{ card: ComparisonCard }>(({ card }) => {
  const Icon = card.icon;
  const delta = card.simulatedValue - card.baselineValue;
  const pctChange =
    card.baselineValue !== 0
      ? (delta / Math.abs(card.baselineValue)) * 100
      : 0;

  const isImprovement = card.lowerIsBetter ? delta < -0.001 : delta > 0.001;
  const isWorsening = card.lowerIsBetter ? delta > 0.001 : delta < -0.001;

  const accentColor = isImprovement
    ? 'text-emerald-400'
    : isWorsening
    ? 'text-rose-400'
    : 'text-slate-400';

  const accentBg = isImprovement
    ? 'bg-emerald-500/10 border-emerald-500/30'
    : isWorsening
    ? 'bg-rose-500/10 border-rose-500/30'
    : 'bg-slate-800/50 border-slate-700';

  const DeltaIcon = isImprovement ? TrendingDown : isWorsening ? TrendingUp : Activity;

  return (
    <div className={`bg-slate-900/80 border rounded-xl p-4 ${accentBg}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${accentColor}`} />
          <span className="text-xs font-medium text-slate-300">{card.label}</span>
        </div>
        <DeltaIcon className={`w-3.5 h-3.5 ${accentColor}`} />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Baseline</p>
          <p className="text-lg font-bold font-mono text-slate-400 tabular-nums">
            {formatMetric(card.baselineValue, card.format)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Simulated</p>
          <p className={`text-lg font-bold font-mono tabular-nums ${accentColor}`}>
            {formatMetric(card.simulatedValue, card.format)}
          </p>
        </div>
      </div>
      <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
        <span className="text-[10px] text-slate-500">Delta</span>
        <span className={`text-xs font-mono font-semibold ${accentColor}`}>
          {delta >= 0 ? '+' : ''}
          {formatMetric(delta, card.format)} ({pctChange >= 0 ? '+' : ''}
          {pctChange.toFixed(1)}%)
        </span>
      </div>
    </div>
  );
});
ComparisonCardView.displayName = 'ComparisonCardView';

// ============================================================
// [FIX #5] Memoized Control Slider
// ============================================================

interface ControlSliderProps {
  control: ControlDefinition;
  value: number;
  onChange: (id: ControlDomain, value: number) => void;
}

const ControlSlider = memo<ControlSliderProps>(({ control, value, onChange }) => {
  const Icon = control.icon;
  const delta = value - control.baselineCoverage;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="p-1.5 rounded-md"
            style={{
              backgroundColor: `${control.accent}15`,
              border: `1px solid ${control.accent}40`,
            }}
          >
            <Icon className="w-3.5 h-3.5" style={{ color: control.accent }} />
          </div>
          <div>
            <p className="text-sm font-medium text-white">{control.name}</p>
            <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
              {control.description}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0 ml-2">
          <p className="text-lg font-bold font-mono text-white tabular-nums">{value}%</p>
          <p
            className={`text-[10px] font-mono ${
              delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-rose-400' : 'text-slate-500'
            }`}
          >
            {delta >= 0 ? '+' : ''}
            {delta}% vs base
          </p>
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(control.id, Number(e.target.value))}
        className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: control.accent }}
        aria-label={`${control.name} coverage`}
      />
      <div className="flex items-center justify-between mt-1.5 text-[10px] font-mono text-slate-600">
        <span>0%</span>
        <span className="text-slate-500">Baseline: {control.baselineCoverage}%</span>
        <span>100%</span>
      </div>
    </div>
  );
});
ControlSlider.displayName = 'ControlSlider';

// ============================================================
// Main Component
// ============================================================

export default function ControlWhatIfSimulator(): JSX.Element {
  const initialCoverage = useMemo<Record<ControlDomain, number>>(() => {
    const init: Record<ControlDomain, number> = {
      'shadow-it': 0, presidio: 0, 'zero-trust': 0, 'circuit-breaker': 0,
    };
    for (const ctrl of CONTROLS) init[ctrl.id] = ctrl.baselineCoverage;
    return init;
  }, []);

  const [coverage, setCoverage] = useState<Record<ControlDomain, number>>(initialCoverage);
  const [activePreset, setActivePreset] = useState<PresetId>('custom');
  const [chartType, setChartType] = useState<'bar' | 'radar'>('bar');
  const [backendResponse, setBackendResponse] = useState<BackendSimulationResponse | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // [FIX #4] AbortController ref — cancels stale in-flight requests
  const abortRef = useRef<AbortController | null>(null);

  const simulated = useMemo(() => simulate(coverage, BASELINE_METRICS), [coverage]);

  // [FIX #1, #2, #4] Sync to backend with correct keys, control ID mapping, and abort
  const syncWithBackend = useCallback(
    async (currentCoverage: Record<ControlDomain, number>) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsSyncing(true);
      try {
        const selectedControls = (Object.keys(currentCoverage) as ControlDomain[])
          .filter((id) => currentCoverage[id] > 40)
          .map((id) => BACKEND_CONTROL_MAP[id]);

        const response = await runRiskSimulation(selectedControls, 62, controller.signal);
        if (response?.success) setBackendResponse(response);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Failed to sync simulation with backend:', err);
        }
      } finally {
        if (abortRef.current === controller) setIsSyncing(false);
      }
    },
    []
  );

  // Debounced sync on coverage change
  useEffect(() => {
    const timer = setTimeout(() => syncWithBackend(coverage), 300);
    return () => clearTimeout(timer);
  }, [coverage, syncWithBackend]);

  // Cleanup on unmount
  useEffect(() => () => abortRef.current?.abort(), []);

  const handleCoverageChange = useCallback((id: ControlDomain, value: number) => {
    setCoverage((prev) => ({ ...prev, [id]: value }));
    setActivePreset('custom');
  }, []);

  const applyPreset = useCallback((preset: PresetScenario) => {
    setCoverage({ ...preset.coverage });
    setActivePreset(preset.id);
  }, []);

  const resetToBaseline = useCallback(() => {
    setCoverage({ ...initialCoverage });
    setActivePreset('custom');
  }, [initialCoverage]);

  useEffect(() => {
    if (activePreset === 'custom') return;
    const preset = PRESETS.find((p) => p.id === activePreset);
    if (!preset) return;
    const isMatch = CONTROLS.every((ctrl) => preset.coverage[ctrl.id] === coverage[ctrl.id]);
    if (!isMatch) setActivePreset('custom');
  }, [coverage, activePreset]);

  // [FIX #3] Convert backend EAL from dollars → $M before formatting
  const comparisonCards: ComparisonCard[] = useMemo(
    () => [
      {
        id: 'exposure',
        label: 'Total Exposure',
        icon: DollarSign,
        baselineValue: BASELINE_METRICS.totalExposure,
        simulatedValue:
          backendResponse?.metrics?.simulatedEal != null
            ? backendResponse.metrics.simulatedEal / 1_000_000
            : simulated.totalExposure,
        format: 'currency',
        lowerIsBetter: true,
      },
      {
        id: 'risk-index',
        label: 'Overall Risk Index',
        icon: Gauge,
        baselineValue: BASELINE_METRICS.riskIndex,
        simulatedValue: simulated.riskIndex,
        format: 'index',
        lowerIsBetter: true,
      },
      {
        id: 'rosi',
        label: 'Return on Security Investment',
        icon: TrendingUp,
        baselineValue: 0,
        simulatedValue: backendResponse?.metrics?.netRoi ?? simulated.rosI,
        format: 'percent',
        lowerIsBetter: false,
      },
    ],
    [simulated, backendResponse]
  );

  // [FIX #7] Uses precomputed BASELINE_MITIGATION
  const barChartData = useMemo(
    () =>
      CONTROLS.map((ctrl) => ({
        name: ctrl.shortName,
        Baseline: Number(BASELINE_MITIGATION[ctrl.id].toFixed(1)),
        Simulated: Number(simulated.mitigationByDomain[ctrl.id].toFixed(1)),
      })),
    [simulated]
  );

  const radarChartData = useMemo(
    () =>
      CONTROLS.map((ctrl) => ({
        domain: ctrl.shortName,
        Baseline: ctrl.baselineCoverage,
        Simulated: coverage[ctrl.id],
      })),
    [coverage]
  );

  return (
    <section
      className="bg-slate-950 border border-slate-800 rounded-xl p-4 lg:p-5 shadow-2xl"
      aria-labelledby="what-if-simulator-heading"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
            <Sliders className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2
              id="what-if-simulator-heading"
              className="text-base lg:text-lg font-semibold text-white flex items-center gap-2"
            >
              Control What-If Simulator
              {isSyncing && (
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded animate-pulse">
                  Syncing API...
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              Model risk &amp; budget tradeoffs across security control domains
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={resetToBaseline}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-400 bg-slate-900/80 border border-slate-800 hover:border-slate-700 hover:text-slate-200 transition-colors"
            aria-label="Reset to baseline coverage"
          >
            <RotateCcw className="w-3 h-3" />
            Reset Baseline
          </button>
          <div className="flex items-center gap-1 p-1 bg-slate-900/80 border border-slate-800 rounded-lg">
            {(['bar', 'radar'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium capitalize transition-colors ${
                  chartType === type
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
                aria-pressed={chartType === type}
              >
                {type === 'bar' ? 'Mitigation' : 'Coverage'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Presets */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2.5">
          <Wand2 className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            Scenario Presets
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {PRESETS.map((preset) => {
            const Icon = preset.icon;
            const isActive = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className={`text-left rounded-lg border p-3 transition-all duration-150 ${
                  isActive
                    ? 'bg-slate-800/80 shadow-lg'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                }`}
                style={isActive ? { borderColor: `${preset.accent}66` } : undefined}
                aria-pressed={isActive}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="p-1 rounded" style={{ backgroundColor: `${preset.accent}15` }}>
                    <Icon className="w-3 h-3" style={{ color: preset.accent }} />
                  </div>
                  <span className="text-xs font-semibold text-white">{preset.name}</span>
                  {isActive && (
                    <span className="ml-auto text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 leading-snug">{preset.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              Control Domain Coverage
            </span>
          </div>
          <div className="space-y-3">
            {CONTROLS.map((ctrl) => (
              <ControlSlider
                key={ctrl.id}
                control={ctrl}
                value={coverage[ctrl.id]}
                onChange={handleCoverageChange}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {chartType === 'bar' ? 'Risk Mitigation by Domain' : 'Coverage Percentage'}
            </span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                  <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
                    <XAxis dataKey="name" stroke={CHART_THEME.axis} tick={CHART_THEME.tick} axisLine={false} tickLine={false} />
                    <YAxis stroke={CHART_THEME.axis} tick={CHART_THEME.tick} axisLine={false} tickLine={false} unit="%" />
                    <Tooltip content={<BarTooltip />} cursor={{ fill: '#1e293b' }} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} iconType="circle" />
                    <Bar dataKey="Baseline" fill="#64748b" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="Simulated" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                ) : (
                  <RadarChart data={radarChartData} cx="50%" cy="50%" outerRadius="75%">
                    <PolarGrid stroke={CHART_THEME.grid} />
                    <PolarAngleAxis dataKey="domain" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 9 }} stroke={CHART_THEME.grid} />
                    <Tooltip content={<RadarTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} iconType="circle" />
                    <Radar name="Baseline" dataKey="Baseline" stroke="#64748b" fill="#64748b" fillOpacity={0.15} strokeWidth={2} />
                    <Radar name="Simulated" dataKey="Simulated" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.25} strokeWidth={2} />
                  </RadarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison cards */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            Simulated Impact — Baseline vs. Simulated
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {comparisonCards.map((card) => (
            <ComparisonCardView key={card.id} card={card} />
          ))}
        </div>
      </div>

      {/* [FIX #3] Trend forecast — backend returns dollars, convert to $M */}
      {backendResponse?.trendForecast && (
        <div className="mt-5 p-4 bg-slate-900/90 border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendIcon className="w-4 h-4 text-cyan-400" />
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                6-Month Predictive Risk Trend Forecast (EAL $M)
              </p>
            </div>
            <span className="text-[10px] text-cyan-400/80 font-mono">
              {backendResponse.recommendation}
            </span>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {backendResponse.trendForecast.map((point) => (
              <div
                key={point.month}
                className="bg-slate-950 p-2.5 rounded border border-slate-800 text-center hover:border-cyan-500/30 transition-colors"
              >
                <span className="text-[10px] text-slate-500 uppercase block font-medium">
                  {point.month}
                </span>
                <span className="text-xs font-bold font-mono text-cyan-400 mt-1 block">
                  ${(point.projectedEal / 1_000_000).toFixed(2)}M
                </span>
                <span className="text-[9px] font-mono text-slate-500 block">
                  VaR: ${(point.projectedVar / 1_000_000).toFixed(2)}M
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Budget summary strip */}
      <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">Baseline Budget</p>
          <p className="text-sm font-bold font-mono text-slate-300 tabular-nums mt-0.5">
            ${BASELINE_METRICS.annualBudget.toLocaleString()}K
          </p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">Simulated Budget</p>
          <p className={`text-sm font-bold font-mono tabular-nums mt-0.5 ${
            simulated.annualBudget > BASELINE_METRICS.annualBudget ? 'text-amber-400' : 'text-emerald-400'
          }`}>
            ${simulated.annualBudget.toLocaleString()}K
          </p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">Budget Delta</p>
          <p className={`text-sm font-bold font-mono tabular-nums mt-0.5 ${
            simulated.annualBudget - BASELINE_METRICS.annualBudget > 0 ? 'text-rose-400' : 'text-emerald-400'
          }`}>
            {simulated.annualBudget - BASELINE_METRICS.annualBudget >= 0 ? '+' : ''}$
            {(simulated.annualBudget - BASELINE_METRICS.annualBudget).toLocaleString()}K
          </p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">Annual Loss Avoided</p>
          <p className="text-sm font-bold font-mono text-emerald-400 tabular-nums mt-0.5">
            ${(BASELINE_METRICS.totalExposure - simulated.totalExposure).toFixed(2)}M
          </p>
        </div>
      </div>

      {/* Footer legend */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">Legend:</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-slate-500" />
          <span className="text-[10px] text-slate-400">Baseline Coverage</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-cyan-500" />
          <span className="text-[10px] text-slate-400">Simulated Outcome</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          <span className="text-[10px] text-slate-400">
            ROSI capped at {MAX_EXPOSURE_REDUCTION * 100}% total risk reduction
          </span>
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-slate-500" />
          <span className="text-[10px] text-slate-500">
            Simulation engine v2.4 · connected to backend
          </span>
        </span>
      </div>
    </section>
  );
}