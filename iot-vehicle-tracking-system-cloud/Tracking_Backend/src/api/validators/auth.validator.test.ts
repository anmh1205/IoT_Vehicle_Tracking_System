import { describe, expect, it } from 'vitest';
import { createUserSchema, loginSchema, updateUserSchema } from './auth.validator';

describe('auth.validator', () => {
  it('accepts valid login payload', () => {
    const parsed = loginSchema.parse({ username: 'admin', password: 'Admin@2026' });
    expect(parsed.username).toBe('admin');
  });

  it('rejects empty username', () => {
    const result = loginSchema.safeParse({ username: '', password: 'x' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid create user username format', () => {
    const result = createUserSchema.safeParse({
      username: 'invalid username',
      password: 'StrongPass123',
      fullName: 'Test User',
      role: 'viewer',
    });
    expect(result.success).toBe(false);
  });

  it('accepts partial update user payload', () => {
    const parsed = updateUserSchema.parse({ status: 'inactive' });
    expect(parsed.status).toBe('inactive');
  });
});
