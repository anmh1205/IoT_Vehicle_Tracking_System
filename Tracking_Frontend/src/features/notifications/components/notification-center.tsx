'use client';

import { NotificationDropdown } from './notification-dropdown';
import { useRealtimeEvents } from '../hooks/use-realtime-events';

export function NotificationCenter() {
  useRealtimeEvents();
  return <NotificationDropdown />;
}
