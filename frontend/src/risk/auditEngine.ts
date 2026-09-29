// frontend/src/risk/auditEngine.ts
// Cryptographic audit ledger + IndexedDB persistence.
//
// ── Hash chain ──────────────────────────────────────────────
//   H_n = SHA-256( H_{n-1} || "|" || payload_n )
//   payload_n = `${timestamp}:${actionType}:${actor}:${details}`
//
//   Any mutation to entry n invalidates every subsequent hash,
//   which is what makes the ledger tamper-EVIDENT (not tamper-proof —
//   that would require signing keys the browser doesn't hold).
import {
  AUDIT_GENESIS_HASH,
  IDB_KEY,
  IDB_NAME,
  IDB_STORE,
  IDB_VERSION,
  PersistedRiskStateSchema,
  type AuditActionType,
  type AuditLogEntry,
  type PersistedRiskState,
} from './schema';

// ============================================================
// Web Crypto — SHA-256 hex digest
// ============================================================
export async function generateSHA256Hash(payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(payload);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const view = new Uint8Array(digest);
  let hex = '';
  for (let i = 0; i < view.length; i++) {
    hex += view[i].toString(16).padStart(2, '0');
  }
  return hex;
}

// ============================================================
// Deterministic payload builder — anything hashed MUST use this
// ============================================================
function buildPayload(
  timestamp: string,
  actionType: AuditActionType,
  actor: string,
  details: string
): string {
  return `${timestamp}:${actionType}:${actor}:${details}`;
}

// ============================================================
// Create the next audit entry in the chain
// ============================================================
export async function createAuditEntry(
  actionType: AuditActionType,
  details: string,
  previousHash: string,
  actor: string = 'operator@optishield'
): Promise<AuditLogEntry> {
  const timestamp = new Date().toISOString();
  const payload = buildPayload(timestamp, actionType, actor, details);
  const currentHash = await generateSHA256Hash(`${previousHash}|${payload}`);

  // Unique id — timestamp + first 8 chars of hash is collision-resistant
  const id = `${timestamp}-${currentHash.slice(0, 8)}`;

  return {
    id,
    timestamp,
    actionType,
    actor,
    details,
    previousHash,
    currentHash,
  };
}

// ============================================================
// Verify an entire ledger — returns false on any break
// ============================================================
export interface LedgerVerification {
  valid: boolean;
  brokenAtIndex: number | null;
  entriesChecked: number;
}

export async function verifyAuditLedger(
  entries: AuditLogEntry[]
): Promise<LedgerVerification> {
  let expectedPrevious = AUDIT_GENESIS_HASH;

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e.previousHash !== expectedPrevious) {
      return { valid: false, brokenAtIndex: i, entriesChecked: i + 1 };
    }
    const payload = buildPayload(e.timestamp, e.actionType, e.actor, e.details);
    const recomputed = await generateSHA256Hash(`${e.previousHash}|${payload}`);
    if (recomputed !== e.currentHash) {
      return { valid: false, brokenAtIndex: i, entriesChecked: i + 1 };
    }
    expectedPrevious = e.currentHash;
  }

  return { valid: true, brokenAtIndex: null, entriesChecked: entries.length };
}

// ============================================================
// IndexedDB — small typed wrapper, no libraries
// ============================================================
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
}

export async function saveStateToIndexedDB(
  state: PersistedRiskState
): Promise<void> {
  // Validate before writing — refuses to persist malformed state.
  PersistedRiskStateSchema.parse(state);

  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.put(state, IDB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IDB put failed'));
  });
  db.close();
}

export async function loadStateFromIndexedDB(): Promise<PersistedRiskState | null> {
  try {
    const db = await openDb();
    const raw = await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(IDB_KEY);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error('IDB get failed'));
    });
    db.close();
    if (raw === undefined || raw === null) return null;
    const parsed = PersistedRiskStateSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function clearIndexedDBState(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IDB delete failed'));
    });
    db.close();
  } catch {
    /* ignore — best-effort clear */
  }
}