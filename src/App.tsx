/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useEffect, useCallback } from 'react';
import SenderFlow from './components/sender/SenderFlow';
import ReceiveMode from './components/ReceiveMode';
import HistoryView from './components/HistoryView';
import SettingsView from './components/SettingsView';
import { cn } from './utils/cn';
import { ScanLine, Send, Moon, Sun, History, SlidersHorizontal, ArrowLeft } from 'lucide-react';
import { ReuseData } from './history/storage';
import './actions'; // registers all action types (side effect)

type AppMode = 'send' | 'receive' | 'history' | 'settings';

export default function App() {
  const [mode, setMode] = useState<AppMode>('send');
  const [isDark, setIsDark] = useState(false);
  const [senderGoBack, setSenderGoBack] = useState<(() => void) | null>(null);
  const [reuseRequest, setReuseRequest] = useState<ReuseData | null>(null);

  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDark(true);
    }
  }, []);

  const handleUseAgain = useCallback((reuse: ReuseData) => {
    setReuseRequest(reuse);
    setMode('send');
  }, []);

  return (
    <div className={cn("min-h-screen bg-[var(--lego-bg)] text-[var(--lego-text)] overflow-hidden relative transition-colors duration-300", isDark ? "dark" : "")}>
      {/* Top-right corner controls: History, Settings, then the theme toggle */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <button
          onClick={() => setMode('history')}
          aria-label="History"
          className={cn(
            "p-3 border-4 shadow-[4px_4px_0px_var(--lego-border)] rounded-xl hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_var(--lego-border)] active:translate-y-1 active:shadow-none transition-all",
            mode === 'history' ? "bg-[#B29500] border-[#7A6600] text-white" : "bg-[var(--lego-card)] border-[var(--lego-border)] text-[var(--lego-text)]"
          )}
        >
          <History className="w-6 h-6" strokeWidth={2.5} />
        </button>
        <button
          onClick={() => setMode('settings')}
          aria-label="Settings"
          className={cn(
            "p-3 border-4 shadow-[4px_4px_0px_var(--lego-border)] rounded-xl hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_var(--lego-border)] active:translate-y-1 active:shadow-none transition-all",
            mode === 'settings' ? "bg-[#D01012] border-[#8C0000] text-white" : "bg-[var(--lego-card)] border-[var(--lego-border)] text-[var(--lego-text)]"
          )}
        >
          <SlidersHorizontal className="w-6 h-6" strokeWidth={2.5} />
        </button>
        <button
          onClick={() => setIsDark(!isDark)}
          aria-label="Toggle dark mode"
          className="p-3 bg-[var(--lego-card)] border-4 border-[var(--lego-border)] shadow-[4px_4px_0px_var(--lego-border)] rounded-xl hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_var(--lego-border)] active:translate-y-1 active:shadow-none transition-all text-[var(--lego-text)]"
        >
          {isDark ? <Sun className="w-6 h-6" strokeWidth={2.5}/> : <Moon className="w-6 h-6" strokeWidth={2.5}/>}
        </button>
      </div>

      {/* Playful Lego Baseplate Background Mesh */}
      <div className="fixed inset-0 z-0 pointer-events-none transition-colors duration-300">
        <div
          className="absolute inset-0 opacity-[0.25]"
          style={{
            backgroundImage: `
              radial-gradient(circle at 10px 10px, var(--lego-stud-dark) 2.5px, transparent 3px),
              radial-gradient(circle at 10px 10px, var(--lego-stud-light) 2px, transparent 2px)
            `,
            backgroundSize: '20px 20px',
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="w-full p-6 flex flex-col items-center">
          <div className="bg-[#FFD500] px-6 py-2 rounded-xl border-4 border-[var(--lego-border)] shadow-[4px_4px_0px_var(--lego-border)] mb-4 rotate-[-2deg] flex items-center gap-2 transition-colors duration-300">
            <ScanLine className="w-6 h-6 text-[#2B2B2B]" strokeWidth={3} />
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[#2B2B2B] uppercase">
              QRMesh
            </h1>
          </div>
          <p className="text-[var(--lego-muted)] font-medium text-center transition-colors duration-300">
            Universal offline QR actions & data transfer. No internet needed!
          </p>

          {/* Mode Toggle */}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {([
              { key: 'send', label: 'Send', icon: Send, activeBg: 'bg-[#0057A6] border-[#003B73]' },
              { key: 'receive', label: 'Receive', icon: ScanLine, activeBg: 'bg-[#00A650] border-[#007036]' },
            ] as const).map(({ key, label, icon: Icon, activeBg }) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                className={cn(
                  "px-6 py-3 rounded-xl text-base font-bold transition-all border-4 flex items-center gap-2 uppercase tracking-wide",
                  mode === key
                    ? `${activeBg} text-white shadow-none translate-y-1`
                    : "bg-[var(--lego-card)] border-[var(--lego-border)] text-[var(--lego-text)] shadow-[4px_4px_0px_var(--lego-border)] hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_var(--lego-border)] active:translate-y-1 active:shadow-none"
                )}
              >
                <Icon className="w-5 h-5" strokeWidth={2.5} />
                {label}
              </button>
            ))}
            {mode === 'send' && senderGoBack && (
              <button
                onClick={senderGoBack}
                className="px-6 py-3 rounded-xl text-base font-bold transition-all border-4 flex items-center gap-2 uppercase tracking-wide bg-[var(--lego-card)] border-[var(--lego-border)] text-[var(--lego-text)] shadow-[4px_4px_0px_var(--lego-border)] hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_var(--lego-border)] active:translate-y-1 active:shadow-none"
              >
                <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
                Back
              </button>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col items-center justify-start p-4 md:p-8">
          {mode === 'send' && (
            <SenderFlow
              onBackHandlerChange={(fn) => setSenderGoBack(() => fn ?? null)}
              reuseRequest={reuseRequest}
              onReuseConsumed={() => setReuseRequest(null)}
            />
          )}
          {mode === 'receive' && <ReceiveMode />}
          {mode === 'history' && <HistoryView onUseAgain={handleUseAgain} />}
          {mode === 'settings' && <SettingsView />}
        </main>

        {/* Footer */}
        <footer className="py-6 text-center text-sm font-bold text-[var(--lego-muted)] uppercase tracking-widest transition-colors duration-300">
          <p>No internet • No servers • No accounts</p>
        </footer>
      </div>
    </div>
  );
}
