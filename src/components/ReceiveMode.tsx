import { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { reassembleAndDecompress, reassembleGenericFile, ReassembledFile, CHUNK_SIZE, MAX_COMPRESSED_BYTES } from '../utils/dataUtils';
import { Camera, RefreshCw, CheckCircle2, FileDown, AlertTriangle, Music } from 'lucide-react';
import { cn } from '../utils/cn';
import { motion } from 'motion/react';
import { isV2Packet, QRMeshReceiver, ScanResult } from '../protocol/decode';
import { QRMeshPayload, PROTOCOL_VERSION } from '../protocol/types';
import { detectStandardFormat } from '../protocol/standardFormats';
import { parseVCard } from '../utils/vcard';
import { getAction } from '../actions';
import { addHistoryEntry } from '../history/storage';

// Derived from the same MAX_COMPRESSED_BYTES ceiling dataUtils enforces before
// decompressing, so a legitimate transfer that fits that budget can never be
// rejected here first — the two limits used to disagree (a real bug: a
// 4395-packet image transfer was rejected by an arbitrary lower chunk cap).
const MAX_LEGACY_CHUNKS = Math.ceil(MAX_COMPRESSED_BYTES / CHUNK_SIZE);

export default function ReceiveMode() {
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [chunks, setChunks] = useState<Record<number, string>>({});
  const [totalExpected, setTotalExpected] = useState<number>(0);
  const [dataType, setDataType] = useState<'image' | 'audio' | 'file' | 'pdf'>('image');
  const [resultData, setResultData] = useState<string | null>(null);
  const [resultFile, setResultFile] = useState<ReassembledFile | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // QRMesh v2 action packets (contact/wifi/url/... — anything from the action registry)
  const [actionPayload, setActionPayload] = useState<QRMeshPayload | null>(null);
  const [actionProgress, setActionProgress] = useState<{ collected: number; total: number } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const receiverRef = useRef(new QRMeshReceiver());
  const v2BusyRef = useRef(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);

  // Stats
  const collectedCount = Object.keys(chunks).length;

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 720 }, height: { ideal: 720 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS
        videoRef.current.play();
        setHasCamera(true);
        setIsScanning(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setHasCamera(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsScanning(false);
    }
  };

  useEffect(() => {
    // Check if fully received
    if (totalExpected > 0 && collectedCount === totalExpected && !resultData) {
      // Reassemble
      const sortedChunks = [];
      for (let i = 0; i < totalExpected; i++) {
        sortedChunks.push(chunks[i]);
      }
      try {
        if (dataType === 'file' || dataType === 'pdf') {
          const file = reassembleGenericFile(sortedChunks);
          setResultFile(file);
          setResultData(file.dataUrl);
        } else {
          const dataUrl = reassembleAndDecompress(sortedChunks, dataType);
          setResultData(dataUrl);
        }
        stopCamera();
      } catch (err) {
        console.error("Failed to decode:", err);
        setActionError(err instanceof Error ? err.message : 'This transfer was corrupted and could not be rebuilt.');
        setChunks({});
        setTotalExpected(0);
      }
    }
  }, [chunks, totalExpected, collectedCount, resultData, dataType]);

  const lastScanRef = useRef(0);
  const SCAN_INTERVAL_MS = 120; // ~8 decode attempts/sec — jsQR is expensive; no need to run it at 60fps

  useEffect(() => {
    const tick = (timestamp: number) => {
      const dueForScan = timestamp - lastScanRef.current >= SCAN_INTERVAL_MS;
      if (dueForScan && isScanning && videoRef.current && canvasRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        lastScanRef.current = timestamp;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code && code.data && isV2Packet(code.data)) {
            if (!v2BusyRef.current && !actionPayload) {
              v2BusyRef.current = true;
              receiverRef.current
                .ingest(code.data)
                .then((result: ScanResult) => {
                  if (result.status === 'progress' && result.progress) {
                    setActionProgress({ collected: result.progress.collected, total: result.progress.total });
                  } else if (result.status === 'complete' && result.payload) {
                    const def = getAction(result.payload.type);
                    if (!def) {
                      setActionError(`Unsupported action type: ${result.payload.type}`);
                      return;
                    }
                    const validation = def.validate(result.payload.data);
                    if (!validation.valid) {
                      setActionError(validation.errors.join('; '));
                      return;
                    }
                    setActionPayload(result.payload);
                    stopCamera();
                  } else if (result.status === 'error') {
                    setActionError(result.error || 'Transfer failed');
                  }
                })
                .finally(() => {
                  v2BusyRef.current = false;
                });
            }
          } else if (code && code.data && /^\d+\|\d+\|/.test(code.data)) {
            // Parse chunk: index|total|type|base64
            const parts = code.data.split('|');
            if (parts.length >= 4) {
              const index = parseInt(parts[0], 10);
              const total = parseInt(parts[1], 10);
              const typeChar = parts[2];
              const data = code.data.substring(parts[0].length + parts[1].length + parts[2].length + 3);

              if (!isNaN(index) && !isNaN(total) && total > 0 && total <= MAX_LEGACY_CHUNKS && index >= 0 && index < total) {
                if (totalExpected === 0) {
                  setTotalExpected(total);
                  const kind = typeChar === 'a' ? 'audio' : typeChar === 'f' ? 'file' : typeChar === 'p' ? 'pdf' : 'image';
                  setDataType(kind);
                } else if (total !== totalExpected) {
                  return; // packet from a different/stale session — ignore rather than corrupt the current one
                }
                setChunks(prev => {
                  if (prev[index]) return prev; // already have it
                  return { ...prev, [index]: data };
                });
              } else if (!isNaN(total) && total > MAX_LEGACY_CHUNKS) {
                setActionError('This transfer claims an unreasonable number of packets and was rejected.');
              }
            } else if (parts.length >= 3) {
              // Backward compatibility for old format: index|total|base64
              const index = parseInt(parts[0], 10);
              const total = parseInt(parts[1], 10);
              const data = code.data.substring(parts[0].length + parts[1].length + 2);

              if (!isNaN(index) && !isNaN(total) && total > 0 && total <= MAX_LEGACY_CHUNKS && index >= 0 && index < total) {
                if (totalExpected === 0) {
                  setTotalExpected(total);
                  setDataType('image');
                } else if (total !== totalExpected) {
                  return;
                }
                setChunks(prev => {
                  if (prev[index]) return prev;
                  return { ...prev, [index]: data };
                });
              }
            }
          } else if (code && code.data && !v2BusyRef.current && !actionPayload) {
            // Not a QRMesh wire format at all — see if it's a standard QR a
            // normal scanner would also understand (vCard, tel:, mailto:,
            // geo:, WIFI:, upi://, a plain URL, or otherwise arbitrary text).
            const match = detectStandardFormat(code.data);
            if (match) {
              let payloadData: unknown = 'data' in match ? match.data : undefined;
              let type = match.type;
              if (match.type === 'CONTACT') {
                const parsed = parseVCard(match.raw);
                if (!parsed) return;
                payloadData = parsed;
              }
              const def = getAction(type);
              if (!def) return;
              const validation = def.validate(payloadData);
              if (!validation.valid) return; // not confidently one of ours — ignore rather than show a bad preview
              setActionPayload({
                protocol: 'QRMesh',
                version: PROTOCOL_VERSION,
                id: 'standard-qr',
                type,
                action: 'external_standard_qr',
                createdAt: Date.now(),
                data: payloadData,
              });
              stopCamera();
            }
          }
        }
      }
      requestRef.current = requestAnimationFrame(tick);
    };

    if (isScanning && !resultData && !actionPayload) {
      requestRef.current = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(requestRef.current);
    };
  }, [isScanning, totalExpected, resultData, actionPayload]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const handleReset = () => {
    setChunks({});
    setTotalExpected(0);
    setResultData(null);
    setResultFile(null);
    setActionPayload(null);
    setActionProgress(null);
    setActionError(null);
    receiverRef.current.reset();
    startCamera();
  };

  const actionDef = actionPayload ? getAction(actionPayload.type) : undefined;

  if (actionPayload && actionDef) {
    const Preview = actionDef.ReceiverPreview;
    return (
      <div className="flex flex-col items-center justify-start w-full max-w-2xl mx-auto py-4">
        <Preview
          data={actionPayload.data}
          onConfirm={() => {
            addHistoryEntry({ type: actionDef.type, label: actionDef.label, direction: 'received', status: 'success' });
            handleReset();
          }}
          onCancel={() => {
            addHistoryEntry({ type: actionDef.type, label: actionDef.label, direction: 'received', status: 'cancelled' });
            handleReset();
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-start w-full max-w-2xl mx-auto py-4">

      {!resultData ? (
        <div className="w-full relative flex flex-col items-center">

          {/* Camera Viewfinder */}
          <div className="relative w-full max-w-md aspect-square rounded-2xl overflow-hidden bg-[#2B2B2B] border-[12px] border-[#0057A6] shadow-[8px_8px_0px_var(--lego-border)] flex items-center justify-center transition-shadow duration-300">
            {hasCamera === false && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-[var(--lego-bg)]">
                <Camera className="w-16 h-16 text-[#D01012] mb-4" strokeWidth={2.5} />
                <p className="text-[#D01012] font-black uppercase text-xl">Camera Blocked</p>
                <p className="font-bold text-[var(--lego-muted)] mt-2">Please allow camera permissions.</p>
              </div>
            )}
            
            <video 
              ref={videoRef} 
              className={cn("w-full h-full object-cover", !isScanning && "hidden")}
              muted playsInline
            />
            
            {/* Hidden canvas for image processing */}
            <canvas ref={canvasRef} className="hidden" />

            {!isScanning && hasCamera !== false && (
              <div className="absolute inset-0 flex items-center justify-center bg-[var(--lego-bg)] z-10 transition-colors duration-300">
                <button
                  onClick={startCamera}
                  className="px-8 py-4 rounded-xl bg-[#00A650] border-4 border-[#007036] text-white font-black text-xl hover:-translate-y-1 shadow-[4px_4px_0px_#007036] hover:shadow-[6px_6px_0px_#007036] active:translate-y-1 active:shadow-none transition-all flex items-center gap-3 uppercase tracking-wide"
                >
                  <Camera className="w-8 h-8" strokeWidth={3} />
                  Start Scanner
                </button>
              </div>
            )}
          </div>

          {actionError && (
            <div className="mt-6 w-full max-w-md flex items-start gap-2 bg-[#FFF7D6] border-4 border-[var(--lego-border)] rounded-xl p-4 text-sm font-bold">
              <AlertTriangle className="w-5 h-5 shrink-0 text-[#B29500]" />
              {actionError}
            </div>
          )}

          {actionProgress && !actionPayload && (
            <div className="mt-6 w-full max-w-md bg-[var(--lego-card)] border-4 border-[var(--lego-border)] rounded-2xl p-6 shadow-[8px_8px_0px_var(--lego-border)]">
              <div className="flex justify-between items-center mb-2">
                <span className="font-black uppercase">Receiving Action</span>
                <span className="font-black text-[#0057A6]">{actionProgress.collected} / {actionProgress.total}</span>
              </div>
              <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden border-2 border-[var(--lego-border)]">
                <div className="h-full bg-[#00A650] transition-all duration-300" style={{ width: `${(actionProgress.collected / actionProgress.total) * 100}%` }} />
              </div>
            </div>
          )}

          {/* Progress Indicators */}
          {isScanning && !actionProgress && (
            <div className="mt-8 w-full max-w-md bg-[var(--lego-card)] border-4 border-[var(--lego-border)] rounded-2xl p-6 shadow-[8px_8px_0px_var(--lego-border)] transition-colors duration-300">
              <div className="flex justify-between items-center mb-4">
                <span className="font-black text-[var(--lego-text)] uppercase">Building {dataType === 'audio' ? 'Audio' : dataType === 'file' ? 'File' : dataType === 'pdf' ? 'PDF' : 'Image'}</span>
                <span className="font-black text-[#0057A6]">
                  {totalExpected > 0 ? `${collectedCount} / ${totalExpected}` : 'WAITING...'}
                </span>
              </div>
              
              {/* Chunk visualizer: LEGO-block grid for small transfers, a plain bar
                  for large ones — rendering one element per chunk stops being
                  reasonable well before totalExpected reaches the thousands. */}
              {totalExpected > 300 ? (
                <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden border-2 border-[var(--lego-border)]">
                  <div className="h-full bg-[#FFD500] transition-all duration-300" style={{ width: `${(collectedCount / totalExpected) * 100}%` }} />
                </div>
              ) : (
                <div className="w-full flex flex-wrap gap-1 p-2 bg-[var(--lego-bg)] border-2 border-[var(--lego-border)] rounded-xl min-h-[60px] content-start transition-colors duration-300">
                  {totalExpected > 0 ? (
                    Array.from({ length: totalExpected }).map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0 }}
                        animate={{ scale: chunks[i] ? 1 : 0 }}
                        className="w-4 h-4 bg-[#FFD500] border-2 border-[#B29500] rounded-sm shadow-sm"
                      />
                    ))
                  ) : (
                    <div className="w-full text-center text-sm font-bold text-[var(--lego-muted)] uppercase py-2">
                      Point camera at sender
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Reveal Animation State */
        <motion.div 
          className="w-full flex flex-col items-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, type: "spring", bounce: 0.5 }}
        >
          <div className="relative w-full max-w-md p-4 rounded-2xl bg-[var(--lego-card)] border-4 border-[var(--lego-border)] shadow-[10px_10px_0px_var(--lego-border)] mb-10 flex flex-col items-center transition-colors duration-300">
            {/* Stud Decoration Header */}
            <div className="absolute -top-3 left-4 right-4 flex justify-around">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="w-6 h-4 bg-[var(--lego-card)] border-4 border-[var(--lego-border)] border-b-0 rounded-t-md transition-colors duration-300" />
              ))}
            </div>

            <div className="relative rounded-xl overflow-hidden bg-[var(--lego-bg)] border-4 border-[var(--lego-border)] w-full p-2 mt-2 transition-colors duration-300">
              {dataType === 'audio' ? (
                <div className="flex flex-col items-center justify-center gap-4 p-6 bg-[#FFD500] rounded-lg">
                  <Music className="w-10 h-10 text-[#2B2B2B]" strokeWidth={2} />
                  <audio src={resultData!} controls autoPlay className="w-full outline-none rounded-lg" />
                  <a
                    href={resultData!}
                    download="qrmesh-audio.wav"
                    className="px-6 py-2 rounded-xl bg-[#2B2B2B] text-white font-black uppercase text-sm shadow-[4px_4px_0px_rgba(0,0,0,0.3)]"
                  >
                    Save Audio
                  </a>
                </div>
              ) : dataType === 'file' || dataType === 'pdf' ? (
                <div className="flex flex-col items-center justify-center gap-3 p-8">
                  <FileDown className="w-12 h-12 text-[#0057A6]" strokeWidth={2} />
                  <p className="font-black text-center break-all">{resultFile?.filename}</p>
                  <p className="text-sm text-[var(--lego-muted)]">{resultFile ? `${(resultFile.size / 1024).toFixed(1)} KB` : ''}</p>
                  <a
                    href={resultData!}
                    download={resultFile?.filename}
                    className="px-6 py-2 rounded-xl bg-[#00A650] border-4 border-[#007036] text-white font-black uppercase shadow-[4px_4px_0px_#007036]"
                  >
                    Save File
                  </a>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <img
                    src={resultData!}
                    alt="Received data"
                    className="w-full h-auto object-contain rounded-lg"
                  />
                  <a
                    href={resultData!}
                    download="qrmesh-image.jpg"
                    className="px-6 py-2 rounded-xl bg-[#00A650] border-4 border-[#007036] text-white font-black uppercase text-sm shadow-[4px_4px_0px_#007036] mb-2"
                  >
                    Save Image
                  </a>
                </div>
              )}
            </div>
            
            {/* Success Badge */}
            <motion.div 
              className="absolute -bottom-6 bg-[#00A650] border-4 border-[#007036] text-white px-6 py-3 rounded-xl shadow-[4px_4px_0px_#007036] flex items-center gap-2 font-black uppercase tracking-wide text-lg"
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: -5 }}
              transition={{ delay: 0.4, type: 'spring', bounce: 0.6 }}
            >
              <CheckCircle2 className="w-6 h-6" strokeWidth={3} />
              Built!
            </motion.div>
          </div>

          <button
            onClick={handleReset}
            className="px-8 py-3 rounded-xl bg-[#0057A6] border-4 border-[#003B73] text-white shadow-[4px_4px_0px_#003B73] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#003B73] active:translate-y-1 active:shadow-none transition-all flex items-center gap-3 uppercase font-black tracking-wide"
          >
            <RefreshCw className="w-5 h-5" strokeWidth={3} />
            Receive Another
          </button>
        </motion.div>
      )}
      
    </div>
  );
}
