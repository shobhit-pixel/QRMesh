import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { CheckCircle2, Download, Copy, Check } from 'lucide-react';

interface UniversalQrViewProps {
  payload: string;
  format: string;
  onClose: () => void;
}

/** Displayed for actions with an interoperable standard format — a single
 * QR any standard camera/scanner can read, with no QRMesh wrapper. */
export function UniversalQrView({ payload, format, onClose }: UniversalQrViewProps) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(payload, {
      // L trades error-correction redundancy for more usable capacity per QR
      // version — for a phone camera photographing a screen, keeping the
      // version (density) low matters more than the ~7% vs ~15% recovery
      // margin, since a too-dense code just fails to scan at all.
      errorCorrectionLevel: 'L',
      margin: 3,
      width: 420,
      color: { dark: '#2B2B2B', light: '#FFFFFF' },
    }).then(setQrDataUrl);
  }, [payload]);

  return (
    <div className="flex flex-col items-center w-full max-w-md">
      <div className="relative w-full bg-[var(--lego-card)] rounded-2xl border-4 border-[var(--lego-border)] shadow-[8px_8px_0px_var(--lego-border)] p-4 flex flex-col items-center transition-colors duration-300">
        <div className="absolute -top-3 left-4 right-4 flex justify-around">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-6 h-4 bg-[var(--lego-card)] border-4 border-[var(--lego-border)] border-b-0 rounded-t-md transition-colors duration-300" />
          ))}
        </div>

        <div className="mt-4 mb-2 flex items-center gap-2 bg-[#00A650] text-white px-3 py-1 rounded-full font-black text-xs uppercase tracking-wide">
          Universal QR · {format}
        </div>

        <div className="relative bg-[var(--lego-bg)] rounded-xl border-4 border-[var(--lego-border)] flex items-center justify-center w-full aspect-square overflow-hidden shadow-inner transition-colors duration-300">
          {qrDataUrl && <img src={qrDataUrl} alt="Universal QR" className="w-full h-full object-contain" />}
        </div>

        <div className="w-full mt-4 flex flex-col gap-1.5 text-sm font-bold text-[var(--lego-text)]">
          <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#00A650]" /> Works with standard QR scanners</span>
          <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#00A650]" /> No QRMesh Receiver required</span>
          <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#00A650]" /> Scannable with phone Camera or Google Lens</span>
        </div>
        <p className="text-xs text-[var(--lego-muted)] mt-2 text-center">
          What happens after scanning is platform dependent — the scanning app/OS controls the resulting screen, not QRMesh.
        </p>
        <p className="text-xs text-[var(--lego-muted)] mt-1">Payload size: {payload.length} bytes</p>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3 w-full">
        <a
          href={qrDataUrl}
          download="qrmesh-universal-qr.png"
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#00A650] border-4 border-[#007036] text-white font-black uppercase text-sm shadow-[4px_4px_0px_#007036]"
        >
          <Download className="w-4 h-4" /> Download PNG
        </a>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(payload);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[var(--lego-card)] border-4 border-[var(--lego-border)] font-black uppercase text-sm shadow-[4px_4px_0px_var(--lego-border)]"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Copied' : 'Copy Payload'}
        </button>
        <button
          onClick={onClose}
          className="px-5 py-3 rounded-xl bg-[var(--lego-bg)] border-4 border-[var(--lego-border)] font-black uppercase text-sm"
        >
          Close
        </button>
      </div>
    </div>
  );
}
