import {
  createConflictError,
  createNotFoundError,
  createValidationError,
} from '@/shared/utils/errors.util';
import { hashPassword, sanitizeUser } from '@/domain/auth/helpers/auth.helpers';
import * as userRepo from '@/domain/auth/repositories/user.repository';
import * as sessionRepo from '@/domain/auth/repositories/user-session.repository';
import { logger } from '@/infrastructure/logger';
import type {
  UserPublic,
  CreateUserInput,
  UpdateUserInput,
  UserListQuery,
} from '@/domain/auth/types/auth.types';

interface NotificationSettings {
  emailAlerts: boolean;
  pushAlerts: boolean;
  alertTypes: string[];
  channels: {
    discord: {
      enabled: boolean;
      webhookUrl: string | null;
    };
    telegram: {
      enabled: boolean;
      botToken: string | null;
      chatId: string | null;
    };
  };
}

const normalizeNullableString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  emailAlerts: true,
  pushAlerts: true,
  alertTypes: ['critical', 'high'],
  channels: {
    discord: {
      enabled: false,
      webhookUrl: null,
    },
    telegram: {
      enabled: false,
      botToken: null,
      chatId: null,
    },
  },
};

const extractNotificationSettings = (
  preferences: Record<string, unknown> | null | undefined,
): NotificationSettings => {
  const current = (preferences?.notifications as Record<string, unknown> | undefined) ?? {};
  const channels = (current.channels as Record<string, unknown> | undefined) ?? {};
  const discord = (channels.discord as Record<string, unknown> | undefined) ?? {};
  const telegram = (channels.telegram as Record<string, unknown> | undefined) ?? {};

  return {
    emailAlerts:
      typeof current.emailAlerts === 'boolean' ? current.emailAlerts : DEFAULT_NOTIFICATION_SETTINGS.emailAlerts,
    pushAlerts:
      typeof current.pushAlerts === 'boolean' ? current.pushAlerts : DEFAULT_NOTIFICATION_SETTINGS.pushAlerts,
    alertTypes: Array.isArray(current.alertTypes) && current.alertTypes.length > 0
      ? current.alertTypes.filter((value): value is string => typeof value === 'string')
      : [...DEFAULT_NOTIFICATION_SETTINGS.alertTypes],
    channels: {
      discord: {
        enabled:
          typeof discord.enabled === 'boolean'
            ? discord.enabled
            : DEFAULT_NOTIFICATION_SETTINGS.channels.discord.enabled,
        webhookUrl: normalizeNullableString(discord.webhookUrl),
      },
      telegram: {
        enabled:
          typeof telegram.enabled === 'boolean'
            ? telegram.enabled
            : DEFAULT_NOTIFICATION_SETTINGS.channels.telegram.enabled,
        botToken: normalizeNullableString(telegram.botToken),
        chatId: normalizeNullableString(telegram.chatId),
      },
    },
  };
};

export const listUsers = async (
  query: UserListQuery,
): Promise<{
  items: UserPublic[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const result = await userRepo.findManyPaged(query);

  return {
    items: result.users.map(sanitizeUser),
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    },
  };
};

export const getUserById = async (id: number): Promise<UserPublic> => {
  const user = await userRepo.findById(id);
  if (!user) {
    throw createNotFoundError(`User with id ${id} not found`);
  }
  return sanitizeUser(user);
};

export const createUser = async (input: CreateUserInput): Promise<UserPublic> => {
  const existing = await userRepo.findByUsername(input.username);
  if (existing) {
    throw createConflictError(`Username "${input.username}" is already taken`);
  }

  if (input.password.length < 8) {
    throw createValidationError('Password must be at least 8 characters');
  }

  const passwordHash = await hashPassword(input.password);
  const user = await userRepo.create(
    input.username,
    passwordHash,
    input.fullName,
    input.role ?? 'viewer',
    input.deviceAccessMode ?? 'assigned',
    input.email,
  );

  logger.info(`User "${input.username}" created`);
  return sanitizeUser(user);
};

export const updateUser = async (id: number, input: UpdateUserInput): Promise<UserPublic> => {
  const existing = await userRepo.findById(id);
  if (!existing) {
    throw createNotFoundError(`User with id ${id} not found`);
  }

  const updated = await userRepo.update(id, {
    full_name: input.fullName,
    role: input.role,
    device_access_mode: input.deviceAccessMode,
    status: input.status,
    email: input.email,
    avatar_url: input.avatarUrl,
  });

  if (!updated) {
    throw createNotFoundError(`User with id ${id} not found`);
  }

  logger.info(`User "${updated.username}" updated`);
  return sanitizeUser(updated);
};

export const deleteUser = async (id: number): Promise<void> => {
  const existing = await userRepo.findById(id);
  if (!existing) {
    throw createNotFoundError(`User with id ${id} not found`);
  }

  // Deactivate all sessions before deleting
  await sessionRepo.deactivateAllForUser(id);
  const deleted = await userRepo.remove(id);

  if (!deleted) {
    throw createNotFoundError(`User with id ${id} not found`);
  }

  logger.info(`User "${existing.username}" deleted`);
};

export const updateProfile = async (
  userId: number,
  input: { fullName?: string; email?: string | null; avatarUrl?: string | null },
): Promise<UserPublic> => {
  const existing = await userRepo.findById(userId);
  if (!existing) {
    throw createNotFoundError(`User with id ${userId} not found`);
  }

  const updated = await userRepo.update(userId, {
    full_name: input.fullName,
    email: input.email,
    avatar_url: input.avatarUrl,
  });

  if (!updated) {
    throw createNotFoundError(`User with id ${userId} not found`);
  }

  logger.info(`User "${updated.username}" updated profile`);
  return sanitizeUser(updated);
};

export const getNotificationPreferences = async (userId: number): Promise<NotificationSettings> => {
  const existing = await userRepo.findById(userId);
  if (!existing) {
    throw createNotFoundError(`User with id ${userId} not found`);
  }

  return extractNotificationSettings(existing.preferences);
};

export const updateNotificationPreferences = async (
  userId: number,
  input: {
    emailAlerts?: boolean;
    pushAlerts?: boolean;
    alertTypes?: string[];
    channels?: {
      discord?: { enabled?: boolean; webhookUrl?: string | null };
      telegram?: { enabled?: boolean; botToken?: string | null; chatId?: string | null };
    };
  },
): Promise<{ preferences: NotificationSettings }> => {
  const existing = await userRepo.findById(userId);
  if (!existing) {
    throw createNotFoundError(`User with id ${userId} not found`);
  }

  const currentSettings = extractNotificationSettings(existing.preferences);
  const discordWebhookUrl =
    input.channels?.discord?.webhookUrl !== undefined
      ? normalizeNullableString(input.channels.discord.webhookUrl)
      : undefined;
  const telegramBotToken =
    input.channels?.telegram?.botToken !== undefined
      ? normalizeNullableString(input.channels.telegram.botToken)
      : undefined;
  const telegramChatId =
    input.channels?.telegram?.chatId !== undefined
      ? normalizeNullableString(input.channels.telegram.chatId)
      : undefined;

  const nextPreferences = {
    ...(existing.preferences ?? {}),
    notifications: {
      ...currentSettings,
      ...(input.emailAlerts !== undefined ? { emailAlerts: input.emailAlerts } : {}),
      ...(input.pushAlerts !== undefined ? { pushAlerts: input.pushAlerts } : {}),
      ...(input.alertTypes !== undefined ? { alertTypes: input.alertTypes } : {}),
      channels: {
        ...currentSettings.channels,
        ...(input.channels?.discord
          ? {
              discord: {
                ...currentSettings.channels.discord,
                ...(input.channels.discord.enabled !== undefined
                  ? { enabled: input.channels.discord.enabled }
                  : {}),
                ...(discordWebhookUrl !== undefined ? { webhookUrl: discordWebhookUrl } : {}),
              },
            }
          : {}),
        ...(input.channels?.telegram
          ? {
              telegram: {
                ...currentSettings.channels.telegram,
                ...(input.channels.telegram.enabled !== undefined
                  ? { enabled: input.channels.telegram.enabled }
                  : {}),
                ...(telegramBotToken !== undefined ? { botToken: telegramBotToken } : {}),
                ...(telegramChatId !== undefined ? { chatId: telegramChatId } : {}),
              },
            }
          : {}),
      },
    },
  };

  const updated = await userRepo.update(userId, {
    preferences: nextPreferences,
  });

  if (!updated) {
    throw createNotFoundError(`User with id ${userId} not found`);
  }

  logger.info(`User "${updated.username}" updated notification preferences`);
  return { preferences: extractNotificationSettings(updated.preferences) };
};
