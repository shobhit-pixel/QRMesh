export interface AppSettings {
  advancedMode: boolean;
  defaultFps: number;
}

const KEY = 'qrmesh.settings.v1';
const DEFAULTS: AppSettings = { advancedMode: false, defaultFps: 3 };

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Storage full or unavailable (e.g. private browsing) — non-fatal.
  }
}
