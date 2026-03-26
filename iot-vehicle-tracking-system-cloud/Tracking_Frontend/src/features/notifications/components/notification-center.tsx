'use client';
import { NotificationDropdown } from './notification-dropdown';
import { useRealtimeEvents } from '../hooks/use-realtime-events';
export const NotificationCenter = () => {
  useRealtimeEvents();
  return <NotificationDropdown />;
};
