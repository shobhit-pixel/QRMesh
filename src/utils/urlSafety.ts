/** Only http(s) — used anywhere a scanned (untrusted) URL becomes a clickable `href`. */
export function isSafeHttpUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}
