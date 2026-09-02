import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { X, RotateCcw, Zap } from 'lucide-react';
import { cn } from '../../utils/cn';

interface QrCarouselProps {
  packets: string[];
  onClose: () => void;
}

/** Generic multi-frame QR display — flips through packets at a configurable FPS. */
export function QrCarousel({ packets, onClose }: QrCarouselProps) {
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [fps, setFps] = useState(packets.length > 1 ? 3 : 1);

  const frameRef = useRef<number>(0);
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (!isPlaying || packets.length <= 1) return;
    const intervalMs = 1000 / fps;
    const loop = (ts: number) => {
      if (ts - lastUpdateRef.current > intervalMs) {
        setIndex((prev) => (prev + 1) % packets.length);
        lastUpdateRef.current = ts;
      }
      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [isPlaying, fps, packets.length]);

  useEffect(() => {
    QRCode.toDataURL(packets[index], {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 320,
      color: { dark: '#2B2B2B', light: '#FFFFFF' },
    }).then(setQrDataUrl);
  }, [index, packets]);

  return (
    <div className="flex flex-col items-center w-full max-w-md">
      <div className="relative w-full bg-[var(--lego-card)] rounded-2xl border-4 border-[var(--lego-border)] shadow-[8px_8px_0px_var(--lego-border)] p-4 flex flex-col items-center transition-colors duration-300">
        <div className="absolute -top-3 left-4 right-4 flex justify-around">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-6 h-4 bg-[var(--lego-card)] border-4 border-[var(--lego-border)] border-b-0 rounded-t-md transition-colors duration-300" />
          ))}
        </div>
        <div className="relative mt-4 bg-[var(--lego-bg)] rounded-xl border-4 border-[var(--lego-border)] flex items-center justify-center w-full aspect-square overflow-hidden shadow-inner transition-colors duration-300">
          {qrDataUrl && <img src={qrDataUrl} alt="QR Data" className="w-full h-full object-contain" />}
        </div>
        {packets.length > 1 && (
          <div className="mt-4 w-full flex items-center justify-between bg-[var(--lego-bg)] border-2 border-[var(--lego-border)] p-2 rounded-lg transition-colors duration-300">
            <div className="flex items-center gap-2 font-bold text-[var(--lego-text)] px-2">
              <span className={cn('w-3 h-3 rounded-full border-2 border-[var(--lego-border)]', isPlaying ? 'bg-[#D01012] animate-pulse' : 'bg-slate-400')} />
              {isPlaying ? 'LIVE' : 'PAUSED'}
            </div>
            <div className="font-black text-xl text-[#0057A6]">{index + 1} / {packets.length}</div>
          </div>
        )}
      </div>

      {packets.length > 1 && (
        <div className="w-full mt-8 bg-[var(--lego-card)] border-4 border-[var(--lego-border)] rounded-xl p-4 shadow-[4px_4px_0px_var(--lego-border)] transition-colors duration-300">
          <div className="flex justify-between items-center mb-2">
            <label className="font-black text-[var(--lego-text)] flex items-center gap-2 uppercase">
              <Zap className="w-5 h-5 text-[#FFD500]" fill="#FFD500" strokeWidth={2} /> Speed
            </label>
            <span className="font-black text-[#0057A6]">{fps} FPS</span>
          </div>
          <input type="range" min="1" max="10" step="1" value={fps} onChange={(e) => setFps(parseInt(e.target.value))} className="w-full h-3 bg-slate-200 rounded-full appearance-none cursor-pointer outline-none border-2 border-[var(--lego-border)] accent-[#D01012]" />
        </div>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-4 w-full">
        {packets.length > 1 && (
          <button
            onClick={() => setIsPlaying((p) => !p)}
            className={cn(
              'px-8 py-3 rounded-xl text-lg font-bold transition-all border-4 uppercase tracking-wide flex-1 min-w-[160px]',
              isPlaying ? 'bg-[#D01012] border-[#8C0000] text-white' : 'bg-[#00A650] border-[#007036] text-white shadow-[4px_4px_0px_#007036]'
            )}
          >
            {isPlaying ? 'Pause' : 'Resume'}
          </button>
        )}
        {packets.length > 1 && (
          <button onClick={() => setIndex(0)} className="p-3 rounded-xl bg-[#FFD500] border-4 border-[#B29500] text-[#2B2B2B] shadow-[4px_4px_0px_#B29500]" title="Restart">
            <RotateCcw className="w-6 h-6" strokeWidth={2.5} />
          </button>
        )}
        <button onClick={onClose} className="p-3 rounded-xl bg-[var(--lego-card)] border-4 border-[var(--lego-border)] text-[var(--lego-text)] shadow-[4px_4px_0px_var(--lego-border)]" title="Close">
          <X className="w-6 h-6" strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}
