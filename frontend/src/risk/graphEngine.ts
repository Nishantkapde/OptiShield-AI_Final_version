// frontend/src/risk/graphEngine.ts
// Supply chain DAG traversal + cascading loss propagation.
//
// ── Algorithm ────────────────────────────────────────────────
// 1. Build forward adjacency + reverse (incoming) maps.
// 2. Topological sort via Kahn's algorithm — O(V + E).
// 3. Propagate in topological order:
//      cascadedEAL[node] = baseEAL[node]
//                        + Σ over incoming edges e:
//                            source.epssScore
//                          × e.couplingWeight
//                          × e.transferLossAmount
// 4. Detect SPOFs and normalize impact scores.
//
// ── Why topological order matters ───────────────────────────
// If A → B → C, we must process A, then B, then C, so that B
// has its full cascaded EAL before C consumes it. Running BFS
// from all sources in arbitrary order would produce wrong
// results on multi-hop graphs.
import {
  CRITICAL_VENDOR_EPSS_THRESHOLD,
  SPOF_COUPLING_THRESHOLD,
  SPOF_MIN_OUTGOING_EDGES,
  type DependencyEdge,
  type DependencyNode,
  type SupplyChainRiskSummary,
} from './schema';

// ============================================================
// Topological sort (Kahn's algorithm)
// Returns node IDs in dependency order. If a cycle exists,
// the returned order is partial — we defensively handle it.
// ============================================================
function topologicalSort(
  nodes: DependencyNode[],
  edges: DependencyEdge[]
): string[] {
  const inDegree = new Map<string, number>();
  const forward = new Map<string, string[]>();

  for (const n of nodes) {
    inDegree.set(n.id, 0);
    forward.set(n.id, []);
  }
  for (const e of edges) {
    forward.get(e.sourceNodeId)?.push(e.targetNodeId);
    inDegree.set(e.targetNodeId, (inDegree.get(e.targetNodeId) ?? 0) + 1);
  }

  // Queue all zero-in-degree nodes
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift() as string;
    order.push(id);
    for (const target of forward.get(id) ?? []) {
      const next = (inDegree.get(target) ?? 1) - 1;
      inDegree.set(target, next);
      if (next === 0) queue.push(target);
    }
  }

  // Cycle fallback: append any unvisited nodes in insertion order.
  if (order.length < nodes.length) {
    for (const n of nodes) {
      if (!order.includes(n.id)) order.push(n.id);
    }
  }

  return order;
}

// ============================================================
// Main entry point
// ============================================================
export function calculateCascadingSupplyChainRisk(
  nodes: DependencyNode[],
  edges: DependencyEdge[]
): SupplyChainRiskSummary {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Build reverse adjacency (incoming edges per target)
  const incoming = new Map<string, DependencyEdge[]>();
  for (const n of nodes) incoming.set(n.id, []);
  for (const e of edges) incoming.get(e.targetNodeId)?.push(e);

  // Forward adjacency for SPOF detection
  const outgoing = new Map<string, DependencyEdge[]>();
  for (const n of nodes) outgoing.set(n.id, []);
  for (const e of edges) outgoing.get(e.sourceNodeId)?.push(e);

  // ── 1. Propagate cascading loss in topological order ─────
  const order = topologicalSort(nodes, edges);
  const cascadedEal = new Map<string, number>();

  for (const nodeId of order) {
    const node = nodeMap.get(nodeId);
    if (!node) continue;

    let total = node.baseEal;

    for (const edge of incoming.get(nodeId) ?? []) {
      const source = nodeMap.get(edge.sourceNodeId);
      if (!source) continue;
      // Cascading contribution = source compromise prob
      //                          × coupling tightness
      //                          × dollar amount that transfers
      total += source.epssScore * edge.couplingWeight * edge.transferLossAmount;
    }

    cascadedEal.set(nodeId, total);
  }

  // ── 2. Normalize impact scores ───────────────────────────
  let maxCascaded = 0;
  for (const v of cascadedEal.values()) {
    if (v > maxCascaded) maxCascaded = v;
  }

  const nodeImpactScores: Record<string, number> = {};
  const cascadedEalByNode: Record<string, number> = {};
  for (const [id, val] of cascadedEal) {
    nodeImpactScores[id] = maxCascaded > 0 ? Number((val / maxCascaded).toFixed(4)) : 0;
    cascadedEalByNode[id] = Math.round(val);
  }

  // ── 3. Total cascaded EAL ────────────────────────────────
  // Sum cascaded EAL of INTERNAL_ASSET nodes only — vendors
  // are sources, not exposure carriers.
  let totalCascadedEal = 0;
  for (const n of nodes) {
    if (n.type === 'INTERNAL_ASSET') {
      totalCascadedEal += cascadedEal.get(n.id) ?? 0;
    }
  }

  // ── 4. Critical vendors ──────────────────────────────────
  const criticalVendorCount = nodes.filter(
    (n) => n.type === 'VENDOR' && n.epssScore >= CRITICAL_VENDOR_EPSS_THRESHOLD
  ).length;

  // ── 5. Single Points of Failure ──────────────────────────
  // A vendor is a SPOF when:
  //   - It has ≥ 2 outgoing edges (blast radius)
  //   - AND at least one edge has coupling ≥ SPOF threshold
  //     (i.e. the vendor is tightly coupled to something)
  const singlePointsOfFailure: string[] = [];
  for (const n of nodes) {
    if (n.type !== 'VENDOR') continue;
    const out = outgoing.get(n.id) ?? [];
    if (out.length < SPOF_MIN_OUTGOING_EDGES) continue;
    const tightEdges = out.filter(
      (e) => e.couplingWeight >= SPOF_COUPLING_THRESHOLD
    );
    if (tightEdges.length >= 1) singlePointsOfFailure.push(n.id);
  }

  return {
    totalCascadedEal: Math.round(totalCascadedEal),
    criticalVendorCount,
    singlePointsOfFailure,
    nodeImpactScores,
    cascadedEalByNode,
  };
}

// ============================================================
// UI helper — colour code for a node by epssScore
// ============================================================
export type NodeRiskTier = 'healthy' | 'elevated' | 'critical';

export function classifyNodeRisk(epssScore: number): NodeRiskTier {
  if (epssScore >= 0.6) return 'critical';
  if (epssScore >= 0.3) return 'elevated';
  return 'healthy';
}