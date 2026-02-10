import {
  createConflictError,
  createNotFoundError,
  createValidationError,
} from '@/shared/utils/errors.util';
import { hashPassword, sanitizeUser } from '@/domain/auth/helpers/auth.helpers';
import * as userRepo from '@/domain/auth/repositories/user.repository';
import * as sessionRepo from '@/domain/auth/repositories/user-session.repository';
import { logger } from '@/infrastructure/logger';
import type { UserPublic, CreateUserInput, UpdateUserInput } from '@/domain/auth/types/auth.types';

export const listUsers = async (): Promise<UserPublic[]> => {
  const users = await userRepo.findAll();
  return users.map(sanitizeUser);
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
