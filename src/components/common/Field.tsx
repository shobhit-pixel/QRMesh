import { cn } from '../../utils/cn';

interface FieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}

export function Field({ label, required, children, hint }: FieldProps) {
  return (
    <label className="block w-full mb-4">
      <span className="block font-black text-sm uppercase tracking-wide text-[var(--lego-text)] mb-1">
        {label}
        {required && <span className="text-[#D01012] ml-1">*</span>}
      </span>
      {children}
      {hint && <span className="block text-xs font-medium text-[var(--lego-muted)] mt-1">{hint}</span>}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'w-full px-4 py-3 rounded-xl border-4 border-[var(--lego-border)] bg-[var(--lego-bg)] text-[var(--lego-text)] font-medium outline-none focus:ring-2 focus:ring-[#0057A6] transition-all',
        props.className
      )}
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        'w-full px-4 py-3 rounded-xl border-4 border-[var(--lego-border)] bg-[var(--lego-bg)] text-[var(--lego-text)] font-medium outline-none focus:ring-2 focus:ring-[#0057A6] transition-all resize-none',
        props.className
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        'w-full px-4 py-3 rounded-xl border-4 border-[var(--lego-border)] bg-[var(--lego-bg)] text-[var(--lego-text)] font-medium outline-none focus:ring-2 focus:ring-[#0057A6] transition-all',
        props.className
      )}
    />
  );
}

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        'w-full px-6 py-3 rounded-xl bg-[#0057A6] border-4 border-[#003B73] text-white font-black uppercase tracking-wide shadow-[4px_4px_0px_#003B73] hover:-translate-y-0.5 active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed',
        props.className
      )}
    />
  );
}
