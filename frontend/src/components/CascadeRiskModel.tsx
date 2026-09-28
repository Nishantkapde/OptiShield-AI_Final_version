// src/components/CascadeRiskModel.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Network,
  User,
  Route,
  Code2,
  Database,
  AlertTriangle,
  Power,
  PowerOff,
  Shield,
  Zap,
  Activity,
  TrendingUp,
  ChevronRight,
  Cpu,
  ArrowRight,
} from 'lucide-react';

// --- Interfaces ---
interface AgentNode {
  id: string;
  name: string;
  type: 'user' | 'router' | 'code' | 'db' | 'api';
  icon: React.ElementType;
  riskScore: number;
  active: boolean;
  compromised: boolean;
  circuitBreakerOpen: boolean;
  description: string;
  downstreamIds: string[];
  vulnerabilities: string[];
}

interface CascadeRisk {
  overallScore: number;
  propagationProbability: number;
  affectedServices: number;
  estimatedImpact: string;
  criticalityLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface AIAnalysisResult {
  affectedNodeIds?: string[];
  maxPropagationHop?: number;
  blastRadiusScore?: number;
  cascadeImpactSummary?: string;
  recommendedContainment?: string[];
}

// --- Initial Data ---
const AGENTS: AgentNode[] = [
  {
    id: 'user',
    name: 'User Input',
    type: 'user',
    icon: User,
    riskScore: 5,
    active: true,
    compromised: false,
    circuitBreakerOpen: false,
    description: 'External user prompt entry point',
    downstreamIds: ['router'],
    vulnerabilities: [],
  },
  {
    id: 'router',
    name: 'Router Agent',
    type: 'router',
    icon: Route,
    riskScore: 22,
    active: true,
    compromised: false,
    circuitBreakerOpen: false,
    description: 'LLM intent classifier & task delegation',
    downstreamIds: ['code', 'api'],
    vulnerabilities: ['Prompt injection exposure'],
  },
  {
    id: 'code',
    name: 'Code Interpreter',
    type: 'code',
    icon: Code2,
    riskScore: 68,
    active: true,
    compromised: true,
    circuitBreakerOpen: false,
    description: 'Python sandbox execution environment',
    downstreamIds: ['db'],
    vulnerabilities: ['Arbitrary code execution', 'Sandbox escape risk'],
  },
  {
    id: 'api',
    name: 'External API Bridge',
    type: 'api',
    icon: Zap,
    riskScore: 45,
    active: true,
    compromised: false,
    circuitBreakerOpen: false,
    description: 'Third-party service integration layer',
    downstreamIds: [],
    vulnerabilities: ['Credential exposure'],
  },
  {
    id: 'db',
    name: 'Database Access',
    type: 'db',
    icon: Database,
    riskScore: 82,
    active: true,
    compromised: false,
    circuitBreakerOpen: false,
    description: 'Production database connector',
    downstreamIds: [],
    vulnerabilities: ['SQL injection', 'Privilege escalation', 'Data exfiltration'],
  },
];

const INITIAL_RISK: CascadeRisk = {
  overallScore: 72,
  propagationProbability: 0.64,
  affectedServices: 3,
  estimatedImpact: '$2.4M',
  criticalityLevel: 'high',
};

export const CascadeRiskModel: React.FC = () => {
  const [agents, setAgents] = useState<AgentNode[]>(AGENTS);
  const [selectedNode, setSelectedNode] = useState<string | null>('code');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);

  const toggleCircuitBreaker = (id: string) => {
    setAgents((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, circuitBreakerOpen: !a.circuitBreakerOpen, active: a.circuitBreakerOpen } : a
      )
    );
  };

  const getNodeById = (id: string) => agents.find((a) => a.id === id);

  const activeRisk = React.useMemo(() => {
    const isolated = agents.filter((a) => a.circuitBreakerOpen).length;
    let score = INITIAL_RISK.overallScore;
    score -= isolated * 15;
    score = Math.max(5, Math.min(100, score));

    return {
      ...INITIAL_RISK,
      overallScore: score,
      affectedServices: Math.max(0, INITIAL_RISK.affectedServices - isolated),
      criticalityLevel:
        score >= 80 ? 'critical' : score >= 60 ? 'high' : score >= 40 ? 'medium' : 'low',
    } as CascadeRisk;
  }, [agents]);

  const riskColor =
    activeRisk.overallScore >= 80
      ? '#f43f5e'
      : activeRisk.overallScore >= 60
      ? '#f59e0b'
      : activeRisk.overallScore >= 40
      ? '#eab308'
      : '#34d399';

  const nodeColor = (node: AgentNode) => {
    if (node.circuitBreakerOpen) return '#64748b';
    if (node.compromised) return '#f43f5e';
    if (node.riskScore >= 60) return '#f59e0b';
    if (node.riskScore >= 30) return '#eab308';
    return '#34d399';
  };

  const selectedAgent = selectedNode ? getNodeById(selectedNode) : null;

  // Run backend blast radius analysis via API
  const handleAnalyzeCascade = async () => {
    if (!selectedAgent) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5001/api/cascade/analyze-blast-radius', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initialBreachNode: selectedAgent.name,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to simulate blast radius.');
      }

      const data = await response.json();
      setAiAnalysis(data.analysis);
    } catch (err: any) {
      setError(err.message || 'Could not connect to Express backend on port 5001.');
    } finally {
      setLoading(false);
    }
  };

  const nodeOrder = ['user', 'router', 'code', 'db'];
  const orderedNodes = nodeOrder.map((id) => getNodeById(id)!).filter(Boolean);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-500/10 rounded-lg border border-rose-500/20">
            <Network className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Cascade Risk Model</h2>
            <p className="text-xs text-slate-400">
              Agentic blast radius & circuit breaker control
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
              activeRisk.criticalityLevel === 'critical'
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                : activeRisk.criticalityLevel === 'high'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : activeRisk.criticalityLevel === 'medium'
                ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            {activeRisk.criticalityLevel.toUpperCase()} RISK
          </span>
        </div>
      </div>

      {/* Risk Score Gauge Panel */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 flex items-center gap-5">
            <div className="relative w-32 h-32 shrink-0">
              <svg viewBox="0 0 100 100" className="transform -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#1e293b" strokeWidth="10" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke={riskColor}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(activeRisk.overallScore / 100) * 264} 264`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold" style={{ color: riskColor }}>
                  {Math.round(activeRisk.overallScore)}
                </span>
                <span className="text-xs text-slate-500">Cascade Score</span>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-slate-500">Propagation Probability</p>
                <p className="text-xl font-bold text-white">
                  {(activeRisk.propagationProbability * 100).toFixed(0)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-mono">Estimated Impact</p>
                <p className="text-xl font-bold text-rose-400">{activeRisk.estimatedImpact}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-xs text-slate-400">Affected Services</span>
              </div>
              <p className="text-2xl font-bold text-white">{activeRisk.affectedServices}</p>
            </div>
            <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs text-slate-400">Isolated Nodes</span>
              </div>
              <p className="text-2xl font-bold text-emerald-400">
                {agents.filter((a) => a.circuitBreakerOpen).length}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-slate-500 font-medium mb-2">Node Status</p>
            {[
              { label: 'Healthy', color: '#34d399' },
              { label: 'Elevated', color: '#eab308' },
              { label: 'Compromised', color: '#f43f5e' },
              { label: 'Isolated', color: '#64748b' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-slate-400">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Execution Chain Visualization */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-5 overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-medium text-white">Execution Chain</h3>
          </div>
          <span className="text-xs text-slate-500">Select node to simulate blast radius</span>
        </div>

        <div className="flex items-center gap-3 min-w-max pb-2">
          {orderedNodes.map((node, idx) => {
            const Icon = node.icon;
            const color = nodeColor(node);
            const isSelected = selectedNode === node.id;

            return (
              <React.Fragment key={node.id}>
                <motion.button
                  onClick={() => setSelectedNode(node.id)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/20'
                      : 'border-slate-700 bg-slate-950/50 hover:border-slate-600'
                  }`}
                  style={{ minWidth: 130 }}
                >
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${color}15`, border: `1px solid ${color}40` }}
                  >
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium text-white">{node.name}</p>
                    <p className="text-xs text-slate-500">Risk: {node.riskScore}</p>
                  </div>

                  <div className="absolute -top-1 -right-1 flex items-center gap-1">
                    {node.circuitBreakerOpen && (
                      <div className="w-3 h-3 rounded-full bg-slate-500 border-2 border-slate-950" />
                    )}
                    {node.compromised && (
                      <div className="w-3 h-3 rounded-full bg-rose-500 border-2 border-slate-950" />
                    )}
                  </div>
                </motion.button>

                {idx < orderedNodes.length - 1 && (
                  <ChevronRight className="w-5 h-5 text-slate-600 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Selected Node Details & Live AI Simulation */}
      {selectedAgent && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>{selectedAgent.name} Details</span>
                {selectedAgent.circuitBreakerOpen && (
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    CIRCUIT BREAKER OPEN
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{selectedAgent.description}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleCircuitBreaker(selectedAgent.id)}
                className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer ${
                  selectedAgent.circuitBreakerOpen
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                }`}
              >
                {selectedAgent.circuitBreakerOpen ? (
                  <>
                    <Power className="w-3.5 h-3.5" /> Re-enable Node
                  </>
                ) : (
                  <>
                    <PowerOff className="w-3.5 h-3.5" /> Trip Circuit Breaker
                  </>
                )}
              </button>

              <button
                onClick={handleAnalyzeCascade}
                disabled={loading}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <Cpu className="w-3.5 h-3.5" />
                {loading ? 'Simulating...' : 'Simulate Blast via Gemini'}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center gap-2 text-rose-400 text-xs font-mono">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* AI Simulation Results */}
          {aiAnalysis && (
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                    Blast Radius Score
                  </span>
                  <span className="text-lg font-mono font-bold text-rose-400">
                    {aiAnalysis.blastRadiusScore || 'N/A'}/100
                  </span>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                    Max Propagation Hops
                  </span>
                  <span className="text-lg font-mono font-bold text-amber-400">
                    {aiAnalysis.maxPropagationHop ?? 'N/A'} Hops
                  </span>
                </div>
              </div>

              {aiAnalysis.cascadeImpactSummary && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                    AI Propagation Impact Summary
                  </span>
                  <p className="text-xs font-mono text-slate-300 leading-relaxed">
                    {aiAnalysis.cascadeImpactSummary}
                  </p>
                </div>
              )}

              {aiAnalysis.recommendedContainment && aiAnalysis.recommendedContainment.length > 0 && (
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1.5">
                    Recommended Mitigation Steps
                  </span>
                  <ul className="space-y-1">
                    {aiAnalysis.recommendedContainment.map((step, idx) => (
                      <li
                        key={idx}
                        className="text-xs font-mono text-slate-300 flex items-start gap-2 bg-slate-950 p-2 border border-slate-800 rounded"
                      >
                        <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0 mt-0.5" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CascadeRiskModel;