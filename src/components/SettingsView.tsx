import { useState } from 'react';
import { ShieldOff, Trash2, Info } from 'lucide-react';
import { loadSettings, saveSettings, AppSettings } from '../settings/storage';
import { clearHistory } from '../history/storage';
import { PROTOCOL_VERSION } from '../protocol/types';

export default function SettingsView() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings());

  const update = (patch: Partial<AppSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  };

  return (
    <div className="w-full max-w-2xl mx-auto py-4 flex flex-col gap-6">
      <h2 className="text-2xl font-black uppercase">Settings</h2>

      <div className="bg-[var(--lego-card)] border-4 border-[var(--lego-border)] rounded-xl p-5 shadow-[4px_4px_0px_var(--lego-border)]">
        <div className="flex items-center gap-2 font-black mb-3"><Info className="w-5 h-5 text-[#0057A6]" /> Privacy</div>
        <ul className="text-sm font-medium text-[var(--lego-muted)] list-disc pl-5 space-y-1">
          <li>No server required</li>
          <li>No account required</li>
          <li>No cloud storage — transfers happen device-to-device via QR codes</li>
          <li>History and preferences are stored only in this browser</li>
        </ul>
      </div>

      <div className="bg-[var(--lego-card)] border-4 border-[var(--lego-border)] rounded-xl p-5 shadow-[4px_4px_0px_var(--lego-border)]">
        <label className="flex items-center justify-between font-black cursor-pointer">
          Advanced mode
          <input type="checkbox" checked={settings.advancedMode} onChange={(e) => update({ advancedMode: e.target.checked })} className="w-5 h-5" />
        </label>
        <p className="text-xs text-[var(--lego-muted)] mt-2">Shows protocol version, checksum, and packet diagnostics during transfers.</p>
        {settings.advancedMode && (
          <div className="mt-3 text-xs font-mono bg-[var(--lego-bg)] border-2 border-[var(--lego-border)] rounded-lg p-3">
            Protocol version: {PROTOCOL_VERSION}<br />
            Chunk transport: QM2 packets (JSON actions) + legacy index|total|type|base64 (binary)
          </div>
        )}
      </div>

      <div className="bg-[var(--lego-card)] border-4 border-[var(--lego-border)] rounded-xl p-5 shadow-[4px_4px_0px_var(--lego-border)]">
        <button
          onClick={() => { if (confirm('Clear all local transfer history?')) clearHistory(); }}
          className="flex items-center gap-2 font-black text-[#D01012]"
        >
          <Trash2 className="w-5 h-5" /> Clear transfer history
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs text-[var(--lego-muted)] font-bold">
        <ShieldOff className="w-4 h-4" /> QRMesh collects no analytics or telemetry.
      </div>
    </div>
  );
}
