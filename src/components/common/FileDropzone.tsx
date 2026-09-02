import { useRef, useState } from 'react';
import { UploadCloud, X, ImageIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface FileDropzoneProps {
  accept?: string;
  onFile: (file: File) => void;
  previewUrl?: string | null;
  onClear?: () => void;
  label?: string;
  hint?: string;
}

/** A properly styled drag-and-drop file picker — replaces the browser's tiny
 * default "Choose File" control with a large, obvious drop target. */
export function FileDropzone({ accept, onFile, previewUrl, onClear, label = 'Click to upload or drag and drop', hint }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFile(file);
  };

  return (
    <div className="w-full mb-4">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          'relative w-full rounded-xl border-4 border-dashed p-4 flex items-center gap-3 cursor-pointer transition-all',
          isDragging
            ? 'border-[#0057A6] bg-[#0057A6]/10'
            : 'border-[var(--lego-border)] bg-[var(--lego-bg)] hover:bg-[var(--lego-card)]'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {previewUrl ? (
          <img src={previewUrl} alt="Preview" className="w-14 h-14 rounded-lg border-2 border-[var(--lego-border)] object-cover shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-lg border-2 border-[var(--lego-border)] bg-[var(--lego-card)] flex items-center justify-center shrink-0">
            <ImageIcon className="w-6 h-6 text-[var(--lego-muted)]" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 font-black text-sm">
            <UploadCloud className="w-4 h-4 text-[#0057A6]" />
            {previewUrl ? 'Replace photo' : label}
          </div>
          {hint && <p className="text-xs text-[var(--lego-muted)] mt-0.5">{hint}</p>}
        </div>
        {previewUrl && onClear && (
          <button
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="shrink-0 p-2 rounded-lg bg-[var(--lego-card)] border-2 border-[var(--lego-border)]"
            aria-label="Remove photo"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
