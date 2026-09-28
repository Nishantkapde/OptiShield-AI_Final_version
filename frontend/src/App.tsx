// src/App.tsx
import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import {
  Activity,
  TrendingUp,
  Brain,
  ShieldCheck,
  Menu,
  X,
  Bell,
  Settings,
  ChevronDown,
} from 'lucide-react';

// --- Component Imports (14 total) ---
import {Sidebar} from './components/Sidebar';
import RevenueAtRiskCards from './components/RevenueAtRiskCards';
import ExposureFunnel from './components/ExposureFunnel';
import TelemetryGrid from './components/TelemetryGrid';
import ShadowITAlert from './components/ShadowITAlert';
import EfficientFrontier from './components/EfficientFrontier';
import { StressTestingSliders } from './components/StressTestingSliders';
import SEBICRIMeter from './components/SEBICRIMeter';
import ServiceDependencyGraph from './components/ServiceDependencyGraph';
import MultiLevelRollup from './components/MultiLevelRollup';
import ControlWhatIfSimulator from './components/ControlWhatIfSimulator';
import CorrelatedKillChain from './components/CorrelatedKillChain';
import PresidioAITerminal from './components/PresidioAITerminal';
import { LogAnalyzer } from './components/LogAnalyzer';
import { CascadeRiskModel } from './components/CascadeRiskModel';

// ============================================================
// Global State Management (Context + Hook)
// ============================================================

export interface GlobalState {
  /** Annual cybersecurity budget in USD */
  cyberBudget: number;
  /** Threat environment severity index (0-100) */
  threatLevel: number;
  /** Active alert count derived from threat level */
  activeAlerts: number;
  /** Baseline revenue exposure in USD derived from budget & threat */
  revenueAtRisk: number;
  /** Derived exposure baseline used across all tabs */
  exposureBaseline: number;
  /** Update the cyber budget */
  setCyberBudget: (v: number) => void;
  /** Update the threat level */
  setThreatLevel: (v: number) => void;
}

const GlobalStateContext = createContext<GlobalState | null>(null);

export const useGlobalState = (): GlobalState => {
  const ctx = useContext(GlobalStateContext);
  if (!ctx) throw new Error('useGlobalState must be used within GlobalStateProvider');
  return ctx;
};

// ============================================================
// Derived Calculations (pure, memoized)
// ============================================================
/**
 * Central derivation engine. Every tab reads from this so slider tweaks
 * propagate instantly across all views.
 *
 *   exposureBaseline = (threatLevel / 100) * BASE_EXPOSURE
 *                      * (1 - mitigationFactor)
 *   mitigationFactor = min(0.9, cyberBudget / (cyberBudget + SOFT_CAP))
 */
const BASE_EXPOSURE = 48_500_000; // $48.5M raw annual exposure
const SOFT_CAP = 12_000_000; // $12M budget where mitigation returns diminish

export const deriveMetrics = (cyberBudget: number, threatLevel: number) => {
  const mitigationFactor = Math.min(0.9, cyberBudget / (cyberBudget + SOFT_CAP));
  const threatMultiplier = 0.5 + (threatLevel / 100) * 1.5; // 0.5x → 2.0x
  const exposureBaseline = BASE_EXPOSURE * threatMultiplier * (1 - mitigationFactor);
  const revenueAtRisk = exposureBaseline * 0.32;
  const activeAlerts = Math.round(240 + threatLevel * 18 - cyberBudget / 40_000);

  return {
    exposureBaseline: Math.max(0, Math.round(exposureBaseline)),
    revenueAtRisk: Math.max(0, Math.round(revenueAtRisk)),
    activeAlerts: Math.max(12, activeAlerts),
  };
};

// ============================================================
// Provider
// ============================================================
const GlobalStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cyberBudget, setCyberBudgetRaw] = useState(6_500_000);
  const [threatLevel, setThreatLevelRaw] = useState(62);

  const setCyberBudget = useCallback((v: number) => setCyberBudgetRaw(v), []);
  const setThreatLevel = useCallback((v: number) => setThreatLevelRaw(v), []);

  const derived = useMemo(
    () => deriveMetrics(cyberBudget, threatLevel),
    [cyberBudget, threatLevel]
  );

  const value: GlobalState = useMemo(
    () => ({
      cyberBudget,
      threatLevel,
      setCyberBudget,
      setThreatLevel,
      ...derived,
    }),
    [cyberBudget, threatLevel, setCyberBudget, setThreatLevel, derived]
  );

  return (
    <GlobalStateContext.Provider value={value}>{children}</GlobalStateContext.Provider>
  );
};

// ============================================================
// Tab Configuration
// ============================================================
type TabId = 'telemetry' | 'capital' | 'ai-privacy';

interface TabConfig {
  id: TabId;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  accent: string;
}

const TABS: TabConfig[] = [
  {
    id: 'telemetry',
    label: 'Telemetry & Exposure',
    sublabel: 'Pain Points 4, 6, 11',
    icon: Activity,
    accent: 'cyan',
  },
  {
    id: 'capital',
    label: 'Capital & Compliance',
    sublabel: 'Pain Points 2, 7, 8',
    icon: TrendingUp,
    accent: 'emerald',
  },
  {
    id: 'ai-privacy',
    label: 'AI Privacy & Cascade Engine',
    sublabel: 'Pain Points 9, 10, 11, 13',
    icon: Brain,
    accent: 'rose',
  },
];

// ============================================================
// Sub-Components
// ============================================================

/** Compact live readout showing global state (visible in header) */
const GlobalStateReadout: React.FC = () => {
  const { cyberBudget, threatLevel, exposureBaseline, revenueAtRisk, activeAlerts } =
    useGlobalState();

  const fmtCurrency = (n: number) =>
    n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${(n / 1_000).toFixed(0)}K`;

  const threatColor =
    threatLevel >= 75 ? 'text-rose-400' : threatLevel >= 50 ? 'text-amber-400' : 'text-emerald-400';

  return (
    <div className="hidden lg:flex items-center gap-4">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 border border-slate-800 rounded-lg">
        <span className="text-xs text-slate-500">Budget</span>
        <span className="text-sm font-mono font-semibold text-emerald-400">
          {fmtCurrency(cyberBudget)}
        </span>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 border border-slate-800 rounded-lg">
        <span className="text-xs text-slate-500">Threat</span>
        <span className={`text-sm font-mono font-semibold ${threatColor}`}>
          {threatLevel}/100
        </span>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 border border-slate-800 rounded-lg">
        <span className="text-xs text-slate-500">Exposure</span>
        <span className="text-sm font-mono font-semibold text-cyan-400">
          {fmtCurrency(exposureBaseline)}
        </span>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 border border-slate-800 rounded-lg">
        <span className="text-xs text-slate-500">RAR</span>
        <span className="text-sm font-mono font-semibold text-rose-400">
          {fmtCurrency(revenueAtRisk)}
        </span>
      </div>
      <div className="relative">
        <Bell className="w-4 h-4 text-slate-400" />
        {activeAlerts > 0 && (
          <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold bg-rose-500 text-white rounded-full">
            {activeAlerts > 99 ? '99+' : activeAlerts}
          </span>
        )}
      </div>
    </div>
  );
};

/** Sticky top navigation with 3 tabs */
const TopNavigation: React.FC<{
  activeTab: TabId;
  onChange: (id: TabId) => void;
  onToggleSidebar: () => void;
}> = ({ activeTab, onChange, onToggleSidebar }) => {
  const accentMap: Record<string, { active: string; glow: string; dot: string }> = {
    cyan: {
      active: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/40',
      glow: 'shadow-cyan-500/20',
      dot: 'bg-cyan-400',
    },
    emerald: {
      active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40',
      glow: 'shadow-emerald-500/20',
      dot: 'bg-emerald-400',
    },
    rose: {
      active: 'bg-rose-500/10 text-rose-400 border-rose-500/40',
      glow: 'shadow-rose-500/20',
      dot: 'bg-rose-400',
    },
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800">
      <div className="px-4 lg:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Brand + Mobile Menu */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-800/60 transition-colors"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-5 h-5 text-slate-300" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 rounded-lg border border-cyan-500/30">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-sm font-bold text-white leading-tight">OptiShield AI</h1>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Cyber-Risk Decision Platform
                </p>
              </div>
            </div>
          </div>

          {/* Center: Tab Switcher */}
          <nav className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-1 p-1 bg-slate-900/80 border border-slate-800 rounded-xl overflow-x-auto">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const accent = accentMap[tab.accent];

                return (
                  <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    className={`group relative flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg text-xs lg:text-sm font-medium whitespace-nowrap transition-all duration-200 border ${
                      isActive
                        ? `${accent.active} ${accent.glow} shadow-lg`
                        : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="hidden md:inline">{tab.label}</span>
                    <span className="md:hidden">{tab.label.split(' ')[0]}</span>
                    {isActive && (
                      <span
                        className={`absolute -bottom-px left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full ${accent.dot}`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Right: Global State + Settings */}
          <div className="flex items-center gap-2 shrink-0">
            <GlobalStateReadout />
            <button
              className="p-2 rounded-lg hover:bg-slate-800/60 transition-colors"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4 text-slate-400" />
            </button>
            <button className="hidden sm:flex items-center gap-2 p-1.5 pr-2.5 rounded-lg hover:bg-slate-800/60 transition-colors">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-[10px] font-bold text-white">
                RS
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Tab sub-label bar */}
      <div className="px-4 lg:px-6 py-1.5 bg-slate-900/40 border-t border-slate-800/60">
        <p className="text-[10px] text-slate-500 font-mono">
          {TABS.find((t) => t.id === activeTab)?.sublabel}
        </p>
      </div>
    </header>
  );
};

/** Shared stress-test slider controls — reactive to global state */
const GlobalControlDeck: React.FC = () => {
  const { cyberBudget, threatLevel, setCyberBudget, setThreatLevel, exposureBaseline } =
    useGlobalState();

  const fmt = (n: number) =>
    n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${n.toLocaleString()}`;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 lg:p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Global Control Deck</h3>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[10px] font-mono text-cyan-400">LIVE</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Cyber Budget Slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="cyberBudget" className="text-xs font-medium text-slate-400">
              Cyber Budget (Annual)
            </label>
            <span className="text-sm font-mono font-bold text-emerald-400">
              {fmt(cyberBudget)}
            </span>
          </div>
          <input
            id="cyberBudget"
            type="range"
            min={500_000}
            max={25_000_000}
            step={100_000}
            value={cyberBudget}
            onChange={(e) => setCyberBudget(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between mt-1 text-[10px] font-mono text-slate-600">
            <span>$0.5M</span>
            <span>$25M</span>
          </div>
        </div>

        {/* Threat Level Slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="threatLevel" className="text-xs font-medium text-slate-400">
              Threat Environment Level
            </label>
            <span
              className={`text-sm font-mono font-bold ${
                threatLevel >= 75
                  ? 'text-rose-400'
                  : threatLevel >= 50
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {threatLevel}/100
            </span>
          </div>
          <input
            id="threatLevel"
            type="range"
            min={0}
            max={100}
            step={1}
            value={threatLevel}
            onChange={(e) => setThreatLevel(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-rose-500"
          />
          <div className="flex justify-between mt-1 text-[10px] font-mono text-slate-600">
            <span>LOW</span>
            <span>CRITICAL</span>
          </div>
        </div>
      </div>

      {/* Derived Exposure Ticker */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
        <span className="text-xs text-slate-500">Derived Exposure Baseline</span>
        <span className="text-sm font-mono font-bold text-cyan-400">{fmt(exposureBaseline)}</span>
      </div>
    </div>
  );
};

// ============================================================
// Tab Views
// ============================================================

const TelemetryExposureTab: React.FC = () => {
  return (
    <div className="space-y-5">
      <GlobalControlDeck />

      {/* KPI Row */}
      <RevenueAtRiskCards />

      {/* Funnel + Alerts side by side on XL */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2">
          <ExposureFunnel />
        </div>
        <div>
          {/* Pain Point 11: Render ShadowITAlert integrated component */}
          <ShadowITAlert />
        </div>
      </div>

      {/* Telemetry Grid Full Width */}
      <TelemetryGrid />
    </div>
  );
};

const CapitalComplianceTab: React.FC = () => {
  return (
    <div className="space-y-5">
      <GlobalControlDeck />

      {/* KPI Row */}
      <RevenueAtRiskCards />

      {/* Efficient Frontier Full Width */}
      <EfficientFrontier />

      {/* Stress Testing + SEBI side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2">
          <StressTestingSliders budget={0} enabledThreats={[]} onBudgetChange={function (value: number): void {
            throw new Error('Function not implemented.');
          } } onThreatToggle={function (id: string): void {
            throw new Error('Function not implemented.');
          } } />
        </div>
        <div>
          <SEBICRIMeter />
        </div>
      </div>

      {/* Dependency Graph + What-If */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ServiceDependencyGraph />
        <ControlWhatIfSimulator />
      </div>

      {/* Rollup + Kill Chain */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <MultiLevelRollup />
        <CorrelatedKillChain />
      </div>
    </div>
  );
};

const AIPrivacyTab: React.FC = () => {
  return (
    <div className="space-y-5">
      <GlobalControlDeck />

      {/* KPI Row */}
      <RevenueAtRiskCards />

      {/* Point 13: Live Log Telemetry Masking & Gemini Threat Engine */}
      <LogAnalyzer />

      {/* Presidio Terminal + Cascade Risk side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <PresidioAITerminal />
        <CascadeRiskModel />
      </div>

      {/* Policy Matrix Full Width */}
      <AgenticPolicyPlaceholder />
    </div>
  );
};

// ============================================================
// Fallback placeholder for components not yet generated
// ============================================================

const AgenticPolicyPlaceholder: React.FC = () => {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-2xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
          <ShieldCheck className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Agentic Policy Matrix</h2>
          <p className="text-xs text-slate-400">Autonomous guardrails & permissions</p>
        </div>
      </div>
      <div className="border border-dashed border-slate-700 rounded-lg p-8 text-center">
        <ShieldCheck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-sm text-slate-400">AgenticPolicyMatrix component</p>
        <p className="text-xs text-slate-600 mt-1">
          Import from ./components/AgenticPolicyMatrix
        </p>
      </div>
    </div>
  );
};

// ============================================================
// Shell Layout (with Sidebar state)
// ============================================================
const AppShell: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('telemetry');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleTabChange = useCallback((id: TabId) => {
    setActiveTab(id);
    // Auto-close mobile sidebar on tab switch
    setSidebarOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <Sidebar activeItem={''} onNavigate={function (item: string): void {
        throw new Error('Function not implemented.');
      } } />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Content */}
      <div className="lg:pl-64 min-h-screen flex flex-col">
        <TopNavigation
          activeTab={activeTab}
          onChange={handleTabChange}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        />

        <main className="flex-1 px-4 lg:px-6 py-5">
          {/* Tab Header */}
          <div className="mb-5">
            <h2 className="text-xl lg:text-2xl font-bold text-white">
              {TABS.find((t) => t.id === activeTab)?.label}
            </h2>
            <p className="text-xs lg:text-sm text-slate-400 mt-0.5">
              {activeTab === 'telemetry' &&
                'Real-time threat ingestion, exposure funneling, and shadow IT discovery.'}
              {activeTab === 'capital' &&
                'Optimal capital allocation, regulatory compliance, and service resilience.'}
              {activeTab === 'ai-privacy' &&
                'PII/PHI sanitization, agentic cascade risk, and autonomous guardrails.'}
            </p>
          </div>

          {/* Tab Body */}
          {activeTab === 'telemetry' && <TelemetryExposureTab />}
          {activeTab === 'capital' && <CapitalComplianceTab />}
          {activeTab === 'ai-privacy' && <AIPrivacyTab />}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800 px-4 lg:px-6 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-[10px] text-slate-600 font-mono">
              OptiShield AI v3.2.1 · Confidential · © 2026
            </p>
            <div className="flex items-center gap-3 text-[10px] text-slate-600 font-mono">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                All Systems Operational
              </span>
              <span>·</span>
              <span>ILP Solver: PuLP 2.9</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

// ============================================================
// Root Export
// ============================================================
const App: React.FC = () => {
  return (
    <GlobalStateProvider>
      <AppShell />
    </GlobalStateProvider>
  );
};

export default App;