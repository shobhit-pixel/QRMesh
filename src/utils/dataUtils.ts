import * as pako from 'pako';

// Encode array buffer to base64
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Decode base64 to array buffer
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

// Max payload size for a reasonable QR code density that can be scanned quickly by a phone
export const CHUNK_SIZE = 60;

// Hard ceiling on compressed bytes we'll ever hand to pako.inflate. Deflate's
// worst-case compression ratio is bounded (~1032:1 for pathological input), so
// capping the input size caps the decompression-bomb blast radius even though
// pako has no native streaming size limit to interrupt mid-decode. Sized well
// above real image/audio transfers (a 5MB audio source can still produce a
// multi-hundred-KB compressed WAV) — this is a sanity ceiling, not a working limit.
export const MAX_COMPRESSED_BYTES = 1_200_000;

function assertSafeToInflate(compressedBase64: string): void {
  if (compressedBase64.length > MAX_COMPRESSED_BYTES) {
    throw new Error('This transfer looks corrupted or unsafe — refusing to decompress.');
  }
}

function encode8BitWAV(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length);
  const view = new DataView(buffer);
  
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // 1 channel
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true); // ByteRate
  view.setUint16(32, 1, true); // BlockAlign
  view.setUint16(34, 8, true); // BitsPerSample
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length, true);

  // Write 8-bit samples (0-255, center 128)
  for (let i = 0; i < samples.length; i++) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    let val = Math.round((s + 1) * 127.5);
    view.setUint8(44 + i, val);
  }
  return buffer;
}

export async function compressAndChunkFile(
  file: File,
  onProgress?: (progress: number, status: string) => void
): Promise<string[]> {
  const wait = () => new Promise(r => setTimeout(r, 30));

  let bytes: Uint8Array;
  let typeFlag = 'i';

  if (file.type.startsWith('audio')) {
    typeFlag = 'a';
    onProgress?.(10, "Loading Audio...");
    await wait();

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    onProgress?.(30, "Decoding Audio...");
    await wait();

    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    audioCtx.close(); // only needed for decoding — release it immediately, browsers cap concurrent AudioContexts

    onProgress?.(50, "Compressing (8kHz Mono)...");
    await wait();
    
    const TARGET_SAMPLE_RATE = 8000;
    const offlineCtx = new OfflineAudioContext(1, Math.ceil(audioBuffer.duration * TARGET_SAMPLE_RATE), TARGET_SAMPLE_RATE);
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start(0);
    const renderedBuffer = await offlineCtx.startRendering();
    
    onProgress?.(70, "Encoding WAV...");
    await wait();
    const wavBuffer = encode8BitWAV(renderedBuffer.getChannelData(0), TARGET_SAMPLE_RATE);
    bytes = new Uint8Array(wavBuffer);
  } else {
    onProgress?.(10, "Loading Image...");
    await wait();

    // Downscale image
    const img = new Image();
    const url = URL.createObjectURL(file);
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });

    onProgress?.(30, "Resizing & Formatting...");
    await wait();

    // Adaptive quality: start reasonably sharp and back off dimensions/quality
    // only as far as needed to fit the QR transport's byte budget, instead of
    // always flattening every photo to a fixed tiny thumbnail.
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const STEPS: { maxDim: number; quality: number }[] = [
      { maxDim: 480, quality: 0.7 },
      { maxDim: 480, quality: 0.5 },
      { maxDim: 320, quality: 0.5 },
      { maxDim: 320, quality: 0.35 },
      { maxDim: 220, quality: 0.3 },
      { maxDim: 150, quality: 0.2 },
    ];
    // Leave headroom under MAX_COMPRESSED_BYTES for pako/base64 overhead — this
    // check is on the raw JPEG bytes, before deflate+base64 inflate the size.
    const RAW_BYTE_BUDGET = Math.floor(MAX_COMPRESSED_BYTES * 0.6);

    let base64Data = '';
    for (const step of STEPS) {
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > step.maxDim) {
          height *= step.maxDim / width;
          width = step.maxDim;
        }
      } else if (height > step.maxDim) {
        width *= step.maxDim / height;
        height = step.maxDim;
      }
      canvas.width = Math.round(width);
      canvas.height = Math.round(height);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL('image/jpeg', step.quality);
      const candidate = dataUrl.split(',')[1];
      base64Data = candidate;
      if (candidate.length <= RAW_BYTE_BUDGET) break; // fits — stop backing off further
    }
    URL.revokeObjectURL(url);

    onProgress?.(50, "Extracting Bytes...");
    await wait();

    // Convert base64 to binary string then to Uint8Array
    const binStr = window.atob(base64Data);
    bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
      bytes[i] = binStr.charCodeAt(i);
    }
  }

  onProgress?.(80, "Compressing Data...");
  await wait();

  // Compress using pako
  const compressed = pako.deflate(bytes);
  
  onProgress?.(90, "Generating Chunks...");
  await wait();

  // Convert to base64
  const compressedBase64 = arrayBufferToBase64(compressed.buffer);

  // Chunking
  const chunks: string[] = [];
  const totalChunks = Math.ceil(compressedBase64.length / CHUNK_SIZE);
  
  for (let i = 0; i < totalChunks; i++) {
    const chunkData = compressedBase64.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    chunks.push(`${i}|${totalChunks}|${typeFlag}|${chunkData}`);
  }

  onProgress?.(100, "Ready to Transmit");
  await wait();

  return chunks;
}

export function reassembleAndDecompress(chunksData: string[], dataType: 'image' | 'audio'): string {
  // join chunks
  const compressedBase64 = chunksData.join('');
  assertSafeToInflate(compressedBase64);
  const compressedBuffer = base64ToArrayBuffer(compressedBase64);
  const decompressed = pako.inflate(new Uint8Array(compressedBuffer));

  // Convert decompressed Uint8Array back to binary string
  let binaryString = '';
  for (let i = 0; i < decompressed.length; i++) {
    binaryString += String.fromCharCode(decompressed[i]);
  }

  const base64 = window.btoa(binaryString);
  const mime = dataType === 'audio' ? 'audio/wav' : 'image/jpeg';
  return `data:${mime};base64,${base64}`;
}

// --- Generic file / PDF transfer (typeFlag 'f'/'p') ---
// Reuses the same chunked base64+pako transport as image/audio, but wraps the
// bytes with a small JSON metadata header (filename/mime/size) since, unlike
// image/audio, the receiver can't infer those from a fixed content type.

export const MAX_GENERIC_FILE_BYTES = 2 * 1024 * 1024; // 2MB raw — keeps packet counts sane over QR throughput

export async function compressAndChunkGenericFile(
  file: File,
  kind: 'file' | 'pdf',
  onProgress?: (progress: number, status: string) => void
): Promise<string[]> {
  const wait = () => new Promise((r) => setTimeout(r, 30));

  if (file.size > MAX_GENERIC_FILE_BYTES) {
    throw new Error(
      `File is ${(file.size / 1024 / 1024).toFixed(1)}MB. This transfer method is safe up to ${MAX_GENERIC_FILE_BYTES / 1024 / 1024}MB in this browser.`
    );
  }

  onProgress?.(10, 'Reading file...');
  await wait();
  const arrayBuffer = await file.arrayBuffer();
  const fileBase64 = arrayBufferToBase64(arrayBuffer);

  const wrapper = JSON.stringify({
    meta: { filename: file.name, mime: file.type || 'application/octet-stream', size: file.size },
    bytes: fileBase64,
  });

  onProgress?.(60, 'Compressing...');
  await wait();
  const compressed = pako.deflate(new TextEncoder().encode(wrapper));
  const compressedBase64 = arrayBufferToBase64(compressed.buffer);

  onProgress?.(90, 'Generating Chunks...');
  await wait();

  const typeFlag = kind === 'pdf' ? 'p' : 'f';
  const chunks: string[] = [];
  const totalChunks = Math.ceil(compressedBase64.length / CHUNK_SIZE);
  for (let i = 0; i < totalChunks; i++) {
    const chunkData = compressedBase64.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    chunks.push(`${i}|${totalChunks}|${typeFlag}|${chunkData}`);
  }

  onProgress?.(100, 'Ready to Transmit');
  await wait();
  return chunks;
}

export interface ReassembledFile {
  dataUrl: string;
  filename: string;
  mime: string;
  size: number;
}

export function reassembleGenericFile(chunksData: string[]): ReassembledFile {
  const compressedBase64 = chunksData.join('');
  assertSafeToInflate(compressedBase64);
  const compressedBuffer = base64ToArrayBuffer(compressedBase64);
  const decompressed = pako.inflate(new Uint8Array(compressedBuffer));
  const wrapperJson = new TextDecoder().decode(decompressed);
  const wrapper = JSON.parse(wrapperJson) as { meta: { filename: string; mime: string; size: number }; bytes: string };
  return {
    dataUrl: `data:${wrapper.meta.mime};base64,${wrapper.bytes}`,
    filename: wrapper.meta.filename,
    mime: wrapper.meta.mime,
    size: wrapper.meta.size,
  };
}
