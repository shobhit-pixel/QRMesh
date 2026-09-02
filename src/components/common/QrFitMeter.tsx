import { CheckCircle2, AlertTriangle, ImageOff } from 'lucide-react';
import { cn } from '../../utils/cn';

interface QrFitMeterProps {
  /** Characters the vCard would use if it fits as a single Universal QR. */
  used: number;
  max: number;
  /** Whether a photo was attached at all. */
  hasPhoto: boolean;
  /** Whether the current best-fit result actually includes the photo. */
  photoIncluded: boolean;
  /** Whether the whole thing fits as one Universal QR (false = falls back to QRMesh Transfer). */
  fits: boolean;
}

/** Live "will this stay a single scannable QR, and will the photo survive?"
 * indicator — shown while filling out Contact/Business Card so there's no
 * surprise about the photo silently disappearing after the QR is generated. */
export function QrFitMeter({ used, max, hasPhoto, photoIncluded, fits }: QrFitMeterProps) {
  const pct = Math.min(100, Math.round((used / max) * 100));
  const barColor = !fits ? '#D01012' : pct > 85 ? '#B29500' : '#00A650';

  return (
    <div className="w-full mb-4 bg-[var(--lego-bg)] border-2 border-[var(--lego-border)] rounded-xl p-3">
      <div className="flex items-center justify-between text-xs font-black uppercase mb-1.5">
        <span>Single QR capacity</span>
        <span>{used} / {max}</span>
      </div>
      <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden border border-[var(--lego-border)]/30">
        <div className="h-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: barColor }} />
      </div>
      <div className={cn('flex items-center gap-1.5 mt-2 text-xs font-bold', fits ? 'text-[var(--lego-muted)]' : 'text-[#D01012]')}>
        {fits ? (
          hasPhoto ? (
            photoIncluded ? (
              <><CheckCircle2 className="w-3.5 h-3.5 text-[#00A650]" /> Fits as one Universal QR, photo included.</>
            ) : (
              <><ImageOff className="w-3.5 h-3.5 text-[#B29500]" /> Fits as one Universal QR, but the photo didn't — try shortening other fields, or a smaller photo.</>
            )
          ) : (
            <><CheckCircle2 className="w-3.5 h-3.5 text-[#00A650]" /> Fits as one Universal QR.</>
          )
        ) : (
          <><AlertTriangle className="w-3.5 h-3.5" /> Too much for one QR — this will use QRMesh Transfer instead (needs QRMesh Receiver).</>
        )}
      </div>
    </div>
  );
}
