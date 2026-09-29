// frontend/src/risk/useSupplyChainRisk.ts
// React hook — owns the graph state + breach simulation.
import { useCallback, useMemo, useState } from 'react';
import { calculateCascadingSupplyChainRisk } from './graphEngine';
import type {
  DependencyEdge,
  DependencyNode,
  SupplyChainRiskSummary,
} from './schema';

interface UseSupplyChainRiskResult {
  /** Nodes after breach overrides — used by the UI */
  effectiveNodes: DependencyNode[];
  edges: DependencyEdge[];
  summary: SupplyChainRiskSummary;
  /** IDs of vendors currently simulated as breached */
  compromisedVendors: ReadonlySet<string>;
  /** Toggle a vendor between healthy (baseline) and breached (epss=1.0) */
  toggleVendorBreach: (vendorId: string) => void;
  /** Reset all breaches */
  clearBreaches: () => void;
}

export function useSupplyChainRisk(
  initialNodes: DependencyNode[],
  edges: DependencyEdge[]
): UseSupplyChainRiskResult {
  const [compromisedVendors, setCompromisedVendors] = useState<Set<string>>(
    () => new Set()
  );

  // Override epssScore → 1.0 for any vendor marked as breached.
  const effectiveNodes = useMemo(() => {
    if (compromisedVendors.size === 0) return initialNodes;
    return initialNodes.map((n) =>
      compromisedVendors.has(n.id) ? { ...n, epssScore: 1.0 } : n
    );
  }, [initialNodes, compromisedVendors]);

  // Recompute the whole DAG on every relevant change.
  // Complexity: O(V + E) — sub-millisecond for the demo portfolio.
  const summary = useMemo(
    () => calculateCascadingSupplyChainRisk(effectiveNodes, edges),
    [effectiveNodes, edges]
  );

  const toggleVendorBreach = useCallback((vendorId: string) => {
    setCompromisedVendors((prev) => {
      const next = new Set(prev);
      if (next.has(vendorId)) next.delete(vendorId);
      else next.add(vendorId);
      return next;
    });
  }, []);

  const clearBreaches = useCallback(() => setCompromisedVendors(new Set()), []);

  return {
    effectiveNodes,
    edges,
    summary,
    compromisedVendors,
    toggleVendorBreach,
    clearBreaches,
  };
}