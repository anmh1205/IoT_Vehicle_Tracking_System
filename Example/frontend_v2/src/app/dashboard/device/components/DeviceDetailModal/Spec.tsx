'use client';

import { DEVICE_RADIUS, DEVICE_SHADOWS, DEVICE_ANIMATIONS } from '../device-design-constants';

export function Spec({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div
      className={`flex items-center justify-between ${DEVICE_RADIUS.md} border border-primary/30 bg-primary/10 px-4 py-3 text-sm ${DEVICE_SHADOWS.stats} ${DEVICE_ANIMATIONS.transition.normal} hover:bg-primary/15 hover:shadow-md`}
    >
      <span className='text-sm font-semibold text-foreground uppercase'>{label}</span>
      <span className='text-sm font-semibold text-foreground tabular-nums normal-case'>{value ?? '—'}</span>
    </div>
  );
}

