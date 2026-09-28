// PresidioAITerminal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Terminal,
  Shield,
  ShieldCheck,
  ShieldOff,
  Zap,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  CreditCard,
  User,
  Activity,
  Cpu,
  Binary,
} from 'lucide-react';

// --- Interfaces ---
interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'block' | 'sanitize';
  raw: string;
  sanitized: string;
  piiTypes: PiiDetection[];
  agentId: string;
  action: 'intercepted' | 'sanitized' | 'blocked' | 'passed';
}

interface PiiDetection {
  type: string;
  value: string;
  redacted: string;
  confidence: number;
  icon: 'credit' | 'user' | 'medical' | 'ssn' | 'email' | 'phone';
}

interface AnonymizationMetrics {
  totalInterceptions: number;
  piiRedacted: number;
  phiRedacted: number;
  blockRate: number;
  avgLatencyMs: number;
}

// --- Mock Data ---
const MOCK_LOGS: LogEntry[] = [
  {
    id: 'l1',
    timestamp: '14:23:45.221',
    level: 'sanitize',
    raw: 'Process refund for customer John Smith, card 4532-1234-5678-9012, SSN 123-45-6789',
    sanitized:
      'Process refund for customer [PERSON_1], card [CREDIT_CARD_1], SSN [US_SSN_1]',
    piiTypes: [
      { type: 'PERSON', value: 'John Smith', redacted: '[PERSON_1]', confidence: 0.98, icon: 'user' },
      {
        type: 'CREDIT_CARD',
        value: '4532-1234-5678-9012',
        redacted: '[CREDIT_CARD_1]',
        confidence: 0.99,
        icon: 'credit',
      },
      { type: 'US_SSN', value: '123-45-6789', redacted: '[US_SSN_1]', confidence: 0.99, icon: 'ssn' },
    ],
    agentId: 'router-agent-01',
    action: 'sanitized',
  },
  {
    id: 'l2',
    timestamp: '14:23:42.108',
    level: 'block',
    raw: 'Patient record for MRN-847291: diagnosis code F32.1, prescribed Sertraline 50mg',
    sanitized: '[BLOCKED - PHI DETECTED]',
    piiTypes: [
      {
        type: 'MEDICAL_RECORD',
        value: 'MRN-847291',
        redacted: '[MRN_1]',
        confidence: 0.97,
        icon: 'medical',
      },
      {
        type: 'MEDICAL_CONDITION',
        value: 'F32.1',
        redacted: '[CONDITION_1]',
        confidence: 0.94,
        icon: 'medical',
      },
    ],
    agentId: 'code-interpreter-03',
    action: 'blocked',
  },
  {
    id: 'l3',
    timestamp: '14:23:38.552',
    level: 'sanitize',
    raw: 'Send onboarding email to sarah.johnson@company.com, phone +1-555-867-5309',
    sanitized: 'Send onboarding email to [EMAIL_1], phone [PHONE_1]',
    piiTypes: [
      { type: 'EMAIL', value: 'sarah.johnson@company.com', redacted: '[EMAIL_1]', confidence: 0.99, icon: 'email' },
      { type: 'PHONE', value: '+1-555-867-5309', redacted: '[PHONE_1]', confidence: 0.96, icon: 'phone' },
    ],
    agentId: 'router-agent-01',
    action: 'sanitized',
  },
  {
    id: 'l4',
    timestamp: '14:23:35.019',
    level: 'sanitize',
    raw: 'Transfer $50,000 from account 9876543210 to IBAN GB29NWBK60161331926819',
    sanitized: 'Transfer $50,000 from account [BANK_ACCT_1] to IBAN [IBAN_1]',
    piiTypes: [
      { type: 'BANK_ACCOUNT', value: '9876543210', redacted: '[BANK_ACCT_1]', confidence: 0.95, icon: 'credit' },
      { type: 'IBAN', value: 'GB29NWBK60161331926819', redacted: '[IBAN_1]', confidence: 0.98, icon: 'credit' },
    ],
    agentId: 'db-access-02',
    action: 'sanitized',
  },
  {
    id: 'l5',
    timestamp: '14:23:31.847',
    level: 'info',
    raw: 'Summarize quarterly earnings report for Q3 2024',
    sanitized: 'Summarize quarterly earnings report for Q3 2024',
    piiTypes: [],
    agentId: 'router-agent-01',
    action: 'passed',
  },
];

const METRICS: AnonymizationMetrics = {
  totalInterceptions: 12847,
  piiRedacted: 3421,
  phiRedacted: 892,
  blockRate: 4.2,
  avgLatencyMs: 12,
};

// --- Helper Icons ---
const PiiIcon: React.FC<{ type: PiiDetection['icon'] }> = ({ type }) => {
  const icons = {
    credit: CreditCard,
    user: User,
    medical: Activity,
    ssn: Lock,
    email: Eye,
    phone: Activity,
  };
  const Icon = icons[type];
  return <Icon className="w-3 h-3" />;
};

// --- Main Component ---
const PresidioAITerminal: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>(MOCK_LOGS);
  const [sanitizationEnabled, setSanitizationEnabled] = useState(true);
  const [showRaw, setShowRaw] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Simulate live log streaming
  useEffect(() => {
    if (!sanitizationEnabled) return;
    const interval = setInterval(() => {
      const newLog = MOCK_LOGS[Math.floor(Math.random() * MOCK_LOGS.length)];
      const now = new Date();
      const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now
        .getMinutes()
        .toString()
        .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now
        .getMilliseconds()
        .toString()
        .padStart(3, '0')}`;
      setLogs((prev) => [
        { ...newLog, id: `live-${Date.now()}`, timestamp },
        ...prev.slice(0, 19),
      ]);
    }, 4000);
    return () => clearInterval(interval);
  }, [sanitizationEnabled]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = 0;
    }
  }, [logs]);

  const levelConfig = {
    info: { color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
    warn: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    block: { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
    sanitize: { color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  };

  const actionConfig = {
    intercepted: { label: 'INTERCEPTED', color: 'text-amber-400', bg: 'bg-amber-500/10' },
    sanitized: { label: 'SANITIZED', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    blocked: { label: 'BLOCKED', color: 'text-rose-400', bg: 'bg-rose-500/10' },
    passed: { label: 'PASSED', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
            <Terminal className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Presidio AI Terminal</h2>
            <p className="text-xs text-slate-400">
              Real-time prompt interception & PII/PHI redaction
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Show Raw Toggle */}
          <button
            onClick={() => setShowRaw(!showRaw)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              showRaw
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
            }`}
          >
            {showRaw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showRaw ? 'Raw View' : 'Sanitized'}
          </button>

          {/* Sanitization Toggle */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg">
            <span className="text-xs text-slate-400">Sanitization</span>
            <button
              onClick={() => setSanitizationEnabled(!sanitizationEnabled)}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                sanitizationEnabled ? 'bg-cyan-500' : 'bg-slate-700'
              }`}
              aria-label="Toggle sanitization"
            >
              <motion.div
                layout
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md ${
                  sanitizationEnabled ? 'right-0.5' : 'left-0.5'
                }`}
              />
            </button>
            {sanitizationEnabled ? (
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
            ) : (
              <ShieldOff className="w-4 h-4 text-rose-400" />
            )}
          </div>
        </div>
      </div>

      {/* Metrics Badges */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Zap className="w-3 h-3 text-cyan-400" />
            <span className="text-xs text-slate-500">Interceptions</span>
          </div>
          <p className="text-lg font-bold text-white">
            {METRICS.totalInterceptions.toLocaleString()}
          </p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <User className="w-3 h-3 text-cyan-400" />
            <span className="text-xs text-slate-500">PII Redacted</span>
          </div>
          <p className="text-lg font-bold text-cyan-400">
            {METRICS.piiRedacted.toLocaleString()}
          </p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity className="w-3 h-3 text-rose-400" />
            <span className="text-xs text-slate-500">PHI Redacted</span>
          </div>
          <p className="text-lg font-bold text-rose-400">{METRICS.phiRedacted}</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span className="text-xs text-slate-500">Block Rate</span>
          </div>
          <p className="text-lg font-bold text-amber-400">{METRICS.blockRate}%</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Cpu className="w-3 h-3 text-emerald-400" />
            <span className="text-xs text-slate-500">Avg Latency</span>
          </div>
          <p className="text-lg font-bold text-emerald-400">{METRICS.avgLatencyMs}ms</p>
        </div>
      </div>

      {/* Terminal Window */}
      <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
        {/* Terminal Title Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
            </div>
            <span className="text-xs text-slate-400 font-mono ml-2">
              presidio-ai-gateway — live stream
            </span>
          </div>
          <div className="flex items-center gap-2">
            {sanitizationEnabled && (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-xs text-cyan-400 font-mono">ACTIVE</span>
              </div>
            )}
            {!sanitizationEnabled && (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                <span className="text-xs text-rose-400 font-mono">BYPASSED</span>
              </div>
            )}
          </div>
        </div>

        {/* Terminal Body */}
        <div
          ref={terminalRef}
          className="p-4 h-96 overflow-y-auto font-mono text-xs space-y-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900"
        >
          <AnimatePresence initial={false}>
            {logs.map((log) => {
              const level = levelConfig[log.level];
              const action = actionConfig[log.action];
              const isExpanded = expandedLog === log.id;

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`border rounded-lg p-3 ${level.bg} ${level.border} cursor-pointer hover:brightness-110 transition-all`}
                  onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                >
                  {/* Log Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">[{log.timestamp}]</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${action.bg} ${action.color}`}>
                        {action.label}
                      </span>
                      <span className="text-slate-500">agent:</span>
                      <span className="text-slate-300">{log.agentId}</span>
                    </div>
                    {log.piiTypes.length > 0 && (
                      <span className="text-xs text-slate-500">
                        {log.piiTypes.length} PII/PHI detected
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="space-y-1">
                    {!showRaw && (
                      <div className="flex items-start gap-2">
                        <span className="text-slate-500 shrink-0">›</span>
                        <span className="text-slate-300 break-all">
                          {sanitizationEnabled ? log.sanitized : log.raw}
                        </span>
                      </div>
                    )}
                    {showRaw && (
                      <>
                        <div className="flex items-start gap-2">
                          <span className="text-amber-500 shrink-0">RAW›</span>
                          <span className="text-amber-200 break-all">{log.raw}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-cyan-500 shrink-0">CLEAN›</span>
                          <span className="text-cyan-200 break-all">{log.sanitized}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* PII Tags */}
                  {log.piiTypes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {log.piiTypes.map((pii, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900/80 border border-slate-700 text-xs text-slate-300"
                        >
                          <PiiIcon type={pii.icon} />
                          <span className="text-cyan-400 font-bold">{pii.type}</span>
                          <span className="text-slate-500">·</span>
                          <span className="text-slate-400">
                            {(pii.confidence * 100).toFixed(0)}%
                          </span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Expanded Detail */}
                  <AnimatePresence>
                    {isExpanded && log.piiTypes.length > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-3 pt-3 border-t border-slate-700/50 space-y-1.5 overflow-hidden"
                      >
                        {log.piiTypes.map((pii, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <PiiIcon type={pii.icon} />
                              <span className="text-slate-400">{pii.type}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-rose-400 line-through">{pii.value}</span>
                              <span className="text-slate-600">→</span>
                              <span className="text-emerald-400 font-semibold">
                                {pii.redacted}
                              </span>
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Live Cursor */}
          {sanitizationEnabled && (
            <div className="flex items-center gap-2 text-slate-500">
              <span className="text-cyan-400">›</span>
              <span className="w-2 h-4 bg-cyan-400 animate-pulse" />
            </div>
          )}
        </div>

        {/* Terminal Footer */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-t border-slate-800">
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <Binary className="w-3 h-3" />
              <span>Presidio Engine v2.2.35</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-3 h-3" />
              <span>Regex + ML Hybrid</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Buffer:</span>
            <span className="text-cyan-400 font-mono">{logs.length}/20</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PresidioAITerminal;