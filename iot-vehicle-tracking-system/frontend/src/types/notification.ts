/**
 * Notification Types
 */
import type { BaseEntity, QueryParams } from './common';

export type NotificationType = 'alert' | 'info' | 'warning' | 'success';

export interface Notification extends BaseEntity {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export interface MarkAsReadDto {
  notificationIds: number[];
}

export interface QueryNotificationDto extends QueryParams {
  isRead?: boolean;
  type?: NotificationType;
}

