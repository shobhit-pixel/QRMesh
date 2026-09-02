import { useState } from 'react';
import { Search, ShieldCheck, ShieldQuestion, ShieldAlert } from 'lucide-react';
import { actionsByCategory } from '../../actions';
import { ActionType, RiskLevel } from '../../protocol/types';
import { cn } from '../../utils/cn';

const riskIcon: Record<RiskLevel, typeof ShieldCheck> = {
  LOW: ShieldCheck,
  MEDIUM: ShieldQuestion,
  HIGH: ShieldAlert,
};
const riskColor: Record<RiskLevel, string> = { LOW: '#00A650', MEDIUM: '#B29500', HIGH: '#D01012' };

export function ActionSelector({ onSelect }: { onSelect: (type: ActionType) => void }) {
  const [query, setQuery] = useState('');
  const grouped = actionsByCategory();

  return (
    <div className="w-full max-w-3xl">
      <div className="relative mb-6">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[var(--lego-muted)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search actions…"
          className="w-full pl-12 pr-4 py-3 rounded-xl border-4 border-[var(--lego-border)] bg-[var(--lego-card)] text-[var(--lego-text)] font-medium outline-none focus:ring-2 focus:ring-[#0057A6]"
        />
      </div>

      {Object.entries(grouped).map(([category, defs]) => {
        const filtered = defs.filter((d) => d.label.toLowerCase().includes(query.toLowerCase()));
        if (filtered.length === 0) return null;
        return (
          <div key={category} className="mb-8">
            <h3 className="font-black uppercase text-sm tracking-widest text-[var(--lego-muted)] mb-3">{category}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filtered.map((def) => {
                const Icon = def.icon;
                const RiskIcon = riskIcon[def.riskLevel];
                return (
                  <button
                    key={def.type}
                    onClick={() => onSelect(def.type)}
                    className={cn(
                      'flex flex-col items-start gap-2 p-4 rounded-xl border-4 border-[var(--lego-border)] bg-[var(--lego-card)] text-left',
                      'shadow-[4px_4px_0px_var(--lego-border)] hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_var(--lego-border)] active:translate-y-1 active:shadow-none transition-all'
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <Icon className="w-6 h-6 text-[#0057A6]" strokeWidth={2.5} />
                      <RiskIcon className="w-4 h-4" style={{ color: riskColor[def.riskLevel] }} />
                    </div>
                    <span className="font-black text-sm uppercase leading-tight">{def.label}</span>
                    <span className="text-xs text-[var(--lego-muted)] leading-snug">{def.description}</span>
                    <span
                      className={cn(
                        'text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full',
                        def.universal ? 'bg-[#00A650]/15 text-[#00A650]' : 'bg-[#0057A6]/15 text-[#0057A6]'
                      )}
                    >
                      {def.universal ? 'Universal QR' : 'QRMesh only'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
