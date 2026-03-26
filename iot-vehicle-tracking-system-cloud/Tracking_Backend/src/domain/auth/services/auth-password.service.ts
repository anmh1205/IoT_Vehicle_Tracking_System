import { createUnauthorizedError, createValidationError } from '@/shared/utils/errors.util';
import { hashPassword, verifyPassword } from '@/domain/auth/helpers/auth.helpers';
import * as userRepo from '@/domain/auth/repositories/user.repository';
import * as userSessionRepo from '@/domain/auth/repositories/user-session.repository';
import { logger } from '@/infrastructure/logger';

export const changePassword = async (
  userId: number,
  currentPassword: string,
  newPassword: string,
): Promise<void> => {
  const user = await userRepo.findById(userId);
  if (!user) {
    throw createUnauthorizedError('User not found');
  }

  const isValid = await verifyPassword(currentPassword, user.password_hash);
  if (!isValid) {
    throw createUnauthorizedError('Current password is incorrect');
  }

  if (currentPassword === newPassword) {
    throw createValidationError('New password must be different from current password');
  }

  const newHash = await hashPassword(newPassword);
  await userRepo.updatePassword(user.id, newHash);
  await userSessionRepo.deactivateAllForUser(user.id);

  logger.info(`Password changed for user "${user.username}"`);
};
