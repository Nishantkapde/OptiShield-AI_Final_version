import React, { useState } from 'react';
import { ShieldCheck, Lock, AlertTriangle, Cpu, CheckCircle2 } from 'lucide-react';

interface RedactedEntity {
  type: string;
  original: string;
  placeholder: string;
}

interface AnalyzeLogResponse {
  status: string;
  originalLength: number;
  maskedPrompt: string;
  redactedEntities: RedactedEntity[];
  aiAnalysis: string;
}

export const LogAnalyzer: React.FC = () => {
  const [rawLog, setRawLog] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeLogResponse | null>(null);

  const handleAnalyze = async () => {
    if (!rawLog.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5001/api/privacy/analyze-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawLog }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to analyze log telemetry.');
      }

      const data: AnalyzeLogResponse = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Could not connect to OptiShield backend on port 5001.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-500/10 rounded-lg border border-rose-500/20">
            <ShieldCheck className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">
              Pain Point 13: Zero-Leak Log Privacy Engine
            </h2>
            <p className="text-xs text-slate-400">
              Regex PII/Credential Interceptor & Gemini Threat Analysis
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 bg-slate-800 text-rose-400 border border-rose-500/30 text-[10px] font-mono rounded-full flex items-center gap-1.5">
          <Lock className="w-3 h-3" /> PII GUARD ACTIVE
        </span>
      </div>

      {/* Input Form */}
      <div className="space-y-3">
        <textarea
          rows={3}
          value={rawLog}
          onChange={(e) => setRawLog(e.target.value)}
          placeholder="Paste raw server log telemetry containing Emails, IPs, AWS Keys, or JWTs..."
          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50"
        />

        <div className="flex items-center justify-between">
          <p className="text-[11px] text-slate-500 font-mono">
            Backend Target: <code className="text-slate-400">http://localhost:5001</code>
          </p>
          <button
            onClick={handleAnalyze}
            disabled={loading || !rawLog.trim()}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            <Cpu className="w-4 h-4" />
            {loading ? 'Sanitizing & Analyzing...' : 'Sanitize & Analyze via AI'}
          </button>
        </div>
      </div>

      {/* Error Output */}
      {error && (
        <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center gap-2 text-rose-400 text-xs font-mono">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Section */}
      {result && (
        <div className="mt-5 pt-5 border-t border-slate-800 space-y-4">
          {/* Masked Prompt */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Masked Payload
              (Sent to Gemini)
            </h3>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-emerald-400 break-all">
              {result.maskedPrompt}
            </div>
          </div>

          {/* Redacted Entities */}
          {result.redactedEntities.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Intercepted Entities ({result.redactedEntities.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.redactedEntities.map((item, idx) => (
                  <div
                    key={idx}
                    className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded text-[11px] font-mono flex items-center gap-2"
                  >
                    <span className="text-rose-400 font-bold">{item.type}</span>
                    <span className="text-slate-500">→</span>
                    <span className="text-cyan-400">{item.placeholder}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Analysis */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Gemini Threat Triage
            </h3>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
              {result.aiAnalysis}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};