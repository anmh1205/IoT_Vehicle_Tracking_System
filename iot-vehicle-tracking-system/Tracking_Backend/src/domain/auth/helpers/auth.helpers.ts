import bcrypt from 'bcryptjs';
import type { User, UserPublic } from '@/domain/auth/types/auth.types';

const SALT_ROUNDS = 12;

export const hashPassword = async (password: string): Promise<string> =>
  bcrypt.hash(password, SALT_ROUNDS);

export const verifyPassword = async (password: string, hash: string): Promise<boolean> =>
  bcrypt.compare(password, hash);

export const sanitizeUser = (user: User): UserPublic => ({
  id: user.id,
  username: user.username,
  fullName: user.full_name,
  role: user.role,
  deviceAccessMode: user.device_access_mode,
  status: user.status,
  email: user.email,
  avatarUrl: user.avatar_url,
});
