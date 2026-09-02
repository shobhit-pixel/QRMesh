import { useState, useEffect } from 'react';
import { Trash2, ArrowUpRight, ArrowDownLeft, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { loadHistory, clearHistory, deleteHistoryEntry, HistoryEntry, ReuseData } from '../history/storage';

function formatTime(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return isToday ? `Today ${time}` : `${d.toLocaleDateString()} ${time}`;
}

interface HistoryViewProps {
  onUseAgain?: (reuse: ReuseData) => void;
}

export default function HistoryView({ onUseAgain }: HistoryViewProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setEntries(loadHistory());
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto py-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black uppercase">Recent Transfers</h2>
        {entries.length > 0 && (
          <button
            onClick={() => { clearHistory(); setEntries([]); }}
            className="flex items-center gap-2 text-sm font-bold text-[#D01012]"
          >
            <Trash2 className="w-4 h-4" /> Clear all
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="text-center text-[var(--lego-muted)] font-bold py-12">No transfers yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between bg-[var(--lego-card)] border-4 border-[var(--lego-border)] rounded-xl p-4 shadow-[4px_4px_0px_var(--lego-border)]">
              <div className="flex items-center gap-3">
                {e.status === 'success' ? <CheckCircle2 className="w-5 h-5 text-[#00A650]" /> : <XCircle className="w-5 h-5 text-[#D01012]" />}
                {e.direction === 'sent' ? <ArrowUpRight className="w-4 h-4 text-[var(--lego-muted)]" /> : <ArrowDownLeft className="w-4 h-4 text-[var(--lego-muted)]" />}
                <div>
                  <div className="font-black">{e.label}</div>
                  <div className="text-xs text-[var(--lego-muted)] font-bold uppercase">{formatTime(e.timestamp)}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {e.reuse && onUseAgain && (
                  <button
                    onClick={() => onUseAgain(e.reuse!)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0057A6] text-white font-black text-xs uppercase"
                    title="Regenerate this QR"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Use Again
                  </button>
                )}
                <button onClick={() => { deleteHistoryEntry(e.id); setEntries(loadHistory()); }} className="text-[var(--lego-muted)]">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
