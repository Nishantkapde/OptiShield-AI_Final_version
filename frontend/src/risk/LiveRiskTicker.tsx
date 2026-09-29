// frontend/src/risk/LiveRiskTicker.tsx
// Animated number ticker — smooth transitions on value change.
import React, { memo, useEffect, useRef, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Gauge, ShieldAlert } from 'lucide-react';

// ============================================================
// Formatters
// ============================================================
const fmtUsd = (n: number): string => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
};

// ============================================================
// Animated number hook — ease-out cubic over `durationMs`.
// Uses requestAnimationFrame so it runs at 60fps and doesn't
// thrash React state during rapid updates.
// ============================================================
function useAnimatedNumber(target: number, durationMs = 600): number {
  const [value, setValue] = useState<number>(target);
  const fromRef = useRef<number>(target);
  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    fromRef.current = value;
    startTimeRef.current = performance.now();

    const tick = (now: number): void => {
      const t = Math.min(1, (now - startTimeRef.current) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = fromRef.current + (target - fromRef.current) * eased;
      setValue(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return value;
}

// ============================================================
// Sub-component: one ticker card
// ============================================================
interface TickerCardProps {
  label: string;
  value: number;
  previous: number;
  icon: React.ElementType;
  accent: string;
  sub?: string;
}

const TickerCard = memo<TickerCardProps>(
  ({ label, value, previous, icon: Icon, accent, sub }) => {
    const animated = useAnimatedNumber(value, 600);
    const delta = value - previous;
    const hasDelta = Math.abs(delta) > 0.5;
    const positive = delta > 0;

    return (
      <div className="relative bg-slate-900/80 border border-slate-800 rounded-xl p-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${accent}`} />
            <span className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">
              {label}
            </span>
          </div>
          {hasDelta && (
            <span
              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                positive
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {positive ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              {fmtUsd(delta)}
            </span>
          )}
        </div>

        {/* Big number */}
        <p
          className={`text-3xl lg:text-4xl font-bold font-mono tabular-nums ${accent} transition-opacity duration-200`}
        >
          {fmtUsd(animated)}
        </p>

        {sub && (
          <p className="text-[10px] font-mono text-slate-500 mt-1">{sub}</p>
        )}

        {/* Subtle pulse on change */}
        {hasDelta && (
          <div
            className={`absolute inset-0 pointer-events-none ${
              positive ? 'bg-rose-500/5' : 'bg-emerald-500/5'
            }`}
          />
        )}
      </div>
    );
  }
);
TickerCard.displayName = 'TickerCard';

// ============================================================
// Props
// ============================================================
interface LiveRiskTickerProps {
  systemEal: number;
  var95: number;
  /** Called on every render — used to render the delta chip */
  previousEal?: number;
}

// ============================================================
// Main component
// ============================================================
const LiveRiskTicker = memo<LiveRiskTickerProps>(
  ({ systemEal, var95, previousEal }) => {
    const [lastEal] = useState(systemEal);
    const prev = previousEal ?? lastEal;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <TickerCard
          label="System EAL"
          value={systemEal}
          previous={prev}
          icon={Gauge}
          accent="text-cyan-400"
          sub="Σ annualized loss expectancy"
        />
        <TickerCard
          label="95% Value at Risk"
          value={var95}
          previous={var95}
          icon={ShieldAlert}
          accent="text-rose-400"
          sub="Monte Carlo tail (from PP5)"
        />
      </div>
    );
  }
);
LiveRiskTicker.displayName = 'LiveRiskTicker';

export default LiveRiskTicker;