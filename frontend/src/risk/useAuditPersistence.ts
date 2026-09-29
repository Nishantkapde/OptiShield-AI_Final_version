// frontend/src/risk/useAuditPersistence.ts
// React hook — in-memory audit ledger + IndexedDB autosave.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createAuditEntry,
  clearIndexedDBState,
  loadStateFromIndexedDB,
  saveStateToIndexedDB,
  verifyAuditLedger,
  type LedgerVerification,
} from './auditEngine';
import {
  AUDIT_GENESIS_HASH,
  type AuditActionType,
  type AuditLogEntry,
  type PersistedRiskState,
} from './schema';

// ============================================================
// Public API
// ============================================================
interface PersistInput {
  cyberBudget: number;
  threatLevel: number;
  maintenanceActive: boolean;
}

interface UseAuditPersistenceResult {
  auditLog: AuditLogEntry[];
  ledgerStatus: LedgerVerification | null;
  /** Append a new entry — returns the new entry, awaits the hash. */
  appendAudit: (actionType: AuditActionType, details: string) => Promise<void>;
  /** Manually trigger a save (autosave also fires on input changes). */
  saveNow: () => Promise<void>;
  /** Wipe IndexedDB + reset the in-memory ledger. */
  resetAll: () => Promise<void>;
  /** Restore state — returns the loaded snapshot, or null if none. */
  restore: () => Promise<PersistedRiskState | null>;
  /** True once hydration from IndexedDB has been attempted. */
  hydrated: boolean;
  /** Last successful persist timestamp (ms). */
  lastSavedAt: number | null;
}

// ============================================================
// Autosave debounce — avoid hammering IndexedDB on slider drags
// ============================================================
const AUTOSAVE_DEBOUNCE_MS = 500;

export function useAuditPersistence(
  input: PersistInput
): UseAuditPersistenceResult {
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [ledgerStatus, setLedgerStatus] = useState<LedgerVerification | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  // Guard so we don't save mid-hydration and clobber the store.
  const hydratedRef = useRef(false);

  // ── Hydrate once on mount ────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const restored = await loadStateFromIndexedDB();
      if (cancelled) return;
      if (restored) setAuditLog(restored.auditLog);
      hydratedRef.current = true;
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Re-verify the ledger whenever it changes ─────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await verifyAuditLedger(auditLog);
      if (!cancelled) setLedgerStatus(result);
    })();
    return () => {
      cancelled = true;
    };
  }, [auditLog]);

  // ── Autosave on input change (debounced) ─────────────────
  const { cyberBudget, threatLevel, maintenanceActive } = input;
  useEffect(() => {
    if (!hydratedRef.current) return;
    const handle = setTimeout(async () => {
      const snapshot: PersistedRiskState = {
        schemaVersion: 1,
        savedAt: new Date().toISOString(),
        cyberBudget,
        threatLevel,
        maintenanceActive,
        auditLog,
      };
      await saveStateToIndexedDB(snapshot);
      setLastSavedAt(Date.now());
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [cyberBudget, threatLevel, maintenanceActive, auditLog]);

  // ── Append audit ─────────────────────────────────────────
  const appendAudit = useCallback(
    async (actionType: AuditActionType, details: string) => {
      // Chain from the last known hash (or genesis).
      const previousHash =
        auditLog.length > 0
          ? auditLog[auditLog.length - 1].currentHash
          : AUDIT_GENESIS_HASH;

      const entry = await createAuditEntry(actionType, details, previousHash);
      setAuditLog((prev) => [...prev, entry]);
    },
    [auditLog]
  );

  // ── Manual save ──────────────────────────────────────────
  const saveNow = useCallback(async () => {
    const snapshot: PersistedRiskState = {
      schemaVersion: 1,
      savedAt: new Date().toISOString(),
      cyberBudget,
      threatLevel,
      maintenanceActive,
      auditLog,
    };
    await saveStateToIndexedDB(snapshot);
    setLastSavedAt(Date.now());
  }, [cyberBudget, threatLevel, maintenanceActive, auditLog]);

  // ── Reset ────────────────────────────────────────────────
  const resetAll = useCallback(async () => {
    await clearIndexedDBState();
    setAuditLog([]);
    setLastSavedAt(null);
  }, []);

  // ── Restore ──────────────────────────────────────────────
  const restore = useCallback(async () => {
    const snap = await loadStateFromIndexedDB();
    if (snap) setAuditLog(snap.auditLog);
    return snap;
  }, []);

  return {
    auditLog,
    ledgerStatus,
    appendAudit,
    saveNow,
    resetAll,
    restore,
    hydrated,
    lastSavedAt,
  };
}