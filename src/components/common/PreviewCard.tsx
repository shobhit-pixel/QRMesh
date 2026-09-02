import { ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { cn } from '../../utils/cn';
import { RiskLevel } from '../../protocol/types';

const riskStyle: Record<RiskLevel, { icon: typeof ShieldCheck; color: string; label: string }> = {
  LOW: { icon: ShieldCheck, color: '#00A650', label: 'Safe to review' },
  MEDIUM: { icon: ShieldQuestion, color: '#FFD500', label: 'Review before continuing' },
  HIGH: { icon: ShieldAlert, color: '#D01012', label: 'Confirm carefully' },
};

interface PreviewCardProps {
  title: string;
  riskLevel: RiskLevel;
  children: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
}

export function PreviewCard({ title, riskLevel, children, onConfirm, onCancel, confirmLabel = 'Continue' }: PreviewCardProps) {
  const risk = riskStyle[riskLevel];
  const Icon = risk.icon;
  return (
    <div className="w-full max-w-md bg-[var(--lego-card)] rounded-2xl border-4 border-[var(--lego-border)] shadow-[8px_8px_0px_var(--lego-border)] p-6 flex flex-col gap-4 transition-colors duration-300">
      <div className="flex items-center gap-2" style={{ color: risk.color }}>
        <Icon className="w-5 h-5" strokeWidth={2.5} />
        <span className="font-black text-xs uppercase tracking-widest">{risk.label}</span>
      </div>
      <h3 className="text-2xl font-black text-[var(--lego-text)] uppercase">{title}</h3>
      <div className="text-[var(--lego-text)] font-medium">{children}</div>
      <div className="flex gap-3 mt-2">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-3 rounded-xl bg-[var(--lego-bg)] border-4 border-[var(--lego-border)] text-[var(--lego-text)] font-black uppercase tracking-wide hover:-translate-y-0.5 active:translate-y-1 transition-all"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className={cn(
            'flex-1 px-4 py-3 rounded-xl border-4 text-white font-black uppercase tracking-wide hover:-translate-y-0.5 active:translate-y-1 transition-all',
            riskLevel === 'HIGH' ? 'bg-[#D01012] border-[#8C0000]' : 'bg-[#00A650] border-[#007036]'
          )}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}

export function PreviewRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 py-1 border-b border-[var(--lego-border)]/20 text-sm">
      <span className="text-[var(--lego-muted)] font-bold uppercase shrink-0">{label}</span>
      <span className="text-right break-words">{value}</span>
    </div>
  );
}
