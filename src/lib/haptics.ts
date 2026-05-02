export const HAPTIC_TOAST_LEVEL_KEY = 'haptic.toast.level';
export const HAPTIC_INTERACTION_LEVEL_KEY = 'haptic.interaction.level';

export const HAPTIC_DEFAULT_TOAST_LEVEL = 35;
export const HAPTIC_DEFAULT_INTERACTION_LEVEL = 20;

export const HAPTIC_MIN_LEVEL = 0;
export const HAPTIC_MAX_LEVEL = 100;

const clampLevel = (value: number) =>
  Math.min(HAPTIC_MAX_LEVEL, Math.max(HAPTIC_MIN_LEVEL, value));

export const getStoredHapticLevel = (key: string, fallback: number) => {
  if (typeof window === 'undefined') return fallback;
  const rawValue = localStorage.getItem(key);
  if (!rawValue) return fallback;
  const parsed = Number(rawValue);
  if (Number.isNaN(parsed)) return fallback;
  return clampLevel(parsed);
};

export const saveHapticLevel = (key: string, value: number) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, String(clampLevel(value)));
};

export const levelToDuration = (level: number, maxDurationMs: number) => {
  const normalized = clampLevel(level) / HAPTIC_MAX_LEVEL;
  return Math.round(maxDurationMs * normalized);
};

// Trigger haptic feedback
export const triggerHaptic = (duration: number) => {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  if (duration <= 0) return;
  try {
    navigator.vibrate(duration);
  } catch {}
};