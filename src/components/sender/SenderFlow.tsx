import { useState, useEffect, useRef } from 'react';
import { Layers } from 'lucide-react';
import { ActionSelector } from './ActionSelector';
import { UniversalQrView } from './UniversalQrView';
import SendMode from '../SendMode';
import { getAction } from '../../actions';
import { ActionType } from '../../protocol/types';
import { buildPayload, serializePayloadToPackets } from '../../protocol/encode';
import { QrCarousel } from '../transfer/QrCarousel';
import { addHistoryEntry, ReuseData } from '../../history/storage';

type Step = 'select' | 'form' | 'universal' | 'transmit';

interface SenderFlowProps {
  /** Reports the current "go back" action up to the shell so it can render a
   * single Back control in the top nav instead of a floating one per screen. */
  onBackHandlerChange?: (goBack: (() => void) | null) => void;
  /** Set by History's "Use Again" — jumps straight to the QR for that past send. */
  reuseRequest?: ReuseData | null;
  onReuseConsumed?: () => void;
}

export default function SenderFlow({ onBackHandlerChange, reuseRequest, onReuseConsumed }: SenderFlowProps) {
  const [step, setStep] = useState<Step>('select');
  const [type, setType] = useState<ActionType | null>(null);
  const [packets, setPackets] = useState<string[]>([]);
  const [universalPayload, setUniversalPayload] = useState('');
  const [universalFormat, setUniversalFormat] = useState('Standard');
  const reuseHandledRef = useRef<ReuseData | null>(null);

  const def = type ? getAction(type) : undefined;

  const reset = () => {
    setStep('select');
    setType(null);
    setPackets([]);
    setUniversalPayload('');
  };

  useEffect(() => {
    onBackHandlerChange?.(step === 'select' ? null : reset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (!reuseRequest || reuseRequest === reuseHandledRef.current) return;
    reuseHandledRef.current = reuseRequest;

    (async () => {
      if (reuseRequest.kind === 'universal') {
        setUniversalFormat(reuseRequest.format);
        setUniversalPayload(reuseRequest.payload);
        setStep('universal');
      } else {
        const def = getAction(reuseRequest.type);
        if (!def) return;
        setType(reuseRequest.type);
        const payload = await buildPayload({ type: reuseRequest.type, action: reuseRequest.actionName, data: reuseRequest.data });
        setPackets(serializePayloadToPackets(payload));
        setStep('transmit');
      }
      onReuseConsumed?.();
    })();
  }, [reuseRequest, onReuseConsumed]);

  const handleSelect = (t: ActionType) => {
    setType(t);
    setStep('form');
  };

  const handleCreate = async (data: unknown) => {
    if (!def) return;
    const validation = def.validate(data);
    if (!validation.valid) return;

    // Prefer the interoperable standard format whenever this action has one and
    // the given data actually produces it (e.g. a Payment Request with no VPA
    // has no standard UPI representation and falls through to QRMesh transfer).
    const universal = def.universal?.encode(data);
    if (universal) {
      setUniversalFormat(def.universal!.format);
      setUniversalPayload(universal);
      setStep('universal');
      addHistoryEntry({
        type: def.type,
        label: def.label,
        direction: 'sent',
        status: 'success',
        sizeBytes: universal.length,
        reuse: { kind: 'universal', payload: universal, format: def.universal!.format },
      });
      return;
    }

    const payload = await buildPayload({ type: def.type, action: def.actionName, data });
    const pkts = serializePayloadToPackets(payload);
    setPackets(pkts);
    setStep('transmit');
    addHistoryEntry({
      type: def.type,
      label: def.label,
      direction: 'sent',
      status: 'success',
      sizeBytes: JSON.stringify(data).length,
      reuse: { kind: 'qrmesh', type: def.type, actionName: def.actionName, data },
    });
  };

  if (step === 'select') {
    return <ActionSelector onSelect={handleSelect} />;
  }

  if (def?.special === 'binary-transfer') {
    // Image/Audio/File/PDF reuse the existing chunked binary transport screen directly.
    return (
      <div className="w-full flex flex-col items-center">
        <SendMode />
      </div>
    );
  }

  if (step === 'form' && def) {
    const Form = def.SenderForm;
    return (
      <div className="w-full flex flex-col items-center">
        <h2 className="text-2xl font-black uppercase mb-1 flex items-center gap-2">
          <def.icon className="w-6 h-6" /> {def.label}
        </h2>
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--lego-muted)] mb-4">
          {def.universal ? `Universal QR (${def.universal.format}) — no QRMesh Receiver needed` : 'QRMesh Transfer — requires QRMesh Receiver'}
        </p>
        <Form onCreate={handleCreate} />
      </div>
    );
  }

  if (step === 'universal') {
    return <UniversalQrView payload={universalPayload} format={universalFormat} onClose={reset} />;
  }

  if (step === 'transmit') {
    return (
      <div className="w-full flex flex-col items-center">
        <div className="flex items-center gap-2 bg-[#0057A6] text-white px-3 py-1 rounded-full font-black text-xs uppercase tracking-wide mb-4">
          <Layers className="w-3.5 h-3.5" /> QRMesh Transfer · Receiver required
        </div>
        <QrCarousel packets={packets} onClose={reset} />
      </div>
    );
  }

  return null;
}
