export const DEVICE_GRADIENTS = {
  running: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
  stopped: 'from-amber-500/20 via-amber-500/5 to-transparent',
  disconnected: 'from-rose-500/20 via-rose-500/5 to-transparent',
} as const;

export const DEVICE_SHADOWS = {
  soft: 'shadow-[0_8px_20px_rgba(15,23,42,0.08)]',
  strong: 'shadow-[0_12px_32px_rgba(15,23,42,0.12)]',
} as const;

export const DEVICE_ANIMATIONS = {
  hoverLift: 'transition-all duration-200 hover:-translate-y-0.5',
} as const;
