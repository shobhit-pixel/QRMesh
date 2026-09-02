/**
 * Hands a generated file (vCard, ICS, etc.) to the OS directly via the Web
 * Share API when available — on Android/iOS this opens the native "Open
 * with" / share sheet immediately (e.g. straight into Contacts), instead of
 * silently saving to Downloads and requiring the user to go find and open
 * it themselves. Falls back to a plain anchor download where Web Share
 * isn't supported (most desktop browsers).
 */
export async function shareOrDownloadFile(content: string, filename: string, mimeType: string): Promise<void> {
  const file = new File([content], filename, { type: mimeType });

  const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file] });
      return;
    } catch {
      // User cancelled the share sheet, or the share failed — fall through to download.
    }
  }

  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
