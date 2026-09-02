import { ActionType } from '../protocol/types';

export type ReuseData =
  | { kind: 'universal'; payload: string; format: string }
  | { kind: 'qrmesh'; type: ActionType; actionName: string; data: unknown };

export interface HistoryEntry {
  id: string;
  type: ActionType;
  label: string;
  direction: 'sent' | 'received';
  status: 'success' | 'failed' | 'cancelled';
  timestamp: number;
  sizeBytes?: number;
  /** Present on "sent" entries so the same QR can be regenerated without refilling the form. */
  reuse?: ReuseData;
}

const KEY = 'qrmesh.history.v1';
const MAX_ENTRIES = 100;

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function addHistoryEntry(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): void {
  const entries = loadHistory();
  entries.unshift({ ...entry, id: crypto.randomUUID(), timestamp: Date.now() });
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // Storage full or unavailable (e.g. private browsing) — history is a
    // convenience, not a transfer-critical path, so fail silently.
  }
}

export function clearHistory(): void {
  localStorage.removeItem(KEY);
}

export function deleteHistoryEntry(id: string): void {
  const entries = loadHistory().filter((e) => e.id !== id);
  localStorage.setItem(KEY, JSON.stringify(entries));
}
