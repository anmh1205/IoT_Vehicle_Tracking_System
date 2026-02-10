import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Tên đăng nhập là bắt buộc'),
  password: z.string().min(1, 'Mật khẩu là bắt buộc'),
  rememberMe: z.boolean().optional(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

