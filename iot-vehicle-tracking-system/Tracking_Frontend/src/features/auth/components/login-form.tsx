'use client';

import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Eye, EyeOff, Info, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authServices } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/stores/auth-store';
import { loginSchema, type LoginFormValues } from '@/lib/validations/auth.schema';

export const LoginForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const reason = searchParams.get('reason');
  const redirectTo =
    redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')
      ? redirectParam
      : '/dashboard';
  const infoMessage = useMemo(() => {
    if (reason === 'session-expired') {
      return 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.';
    }
    if (reason === 'signed-out') {
      return 'Bạn đã đăng xuất khỏi hệ thống.';
    }
    return null;
  }, [reason]);
  const setAuth = useAuthStore((state) => state.setAuth);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '', rememberMe: false },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setErrorMessage(null);
    try {
      const data = await authServices.login({
        username: values.username,
        password: values.password,
      });
      setAuth(
        {
          ...data.user,
          isActive: data.user.status ? data.user.status === 'active' : true,
        },
        data.token,
      );
      router.replace(redirectTo);
    } catch {
      setErrorMessage('Thông tin đăng nhập không chính xác. Vui lòng thử lại.');
    }
  };

  return (
    <Card className="w-full max-w-md border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>Đăng nhập hệ thống</CardTitle>
        <CardDescription>Nhập tài khoản để tiếp tục điều phối và giám sát đội xe.</CardDescription>
      </CardHeader>
      <CardContent>
        {infoMessage ? (
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertTitle>Cần đăng nhập lại</AlertTitle>
            <AlertDescription>{infoMessage}</AlertDescription>
          </Alert>
        ) : null}

        {errorMessage ? (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Đăng nhập thất bại</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Tên đăng nhập</Label>
            <Input
              id="username"
              type="text"
              placeholder="Nhập tên đăng nhập"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              {...register('username')}
            />
            {errors.username ? (
              <p role="alert" aria-live="polite" className="text-sm text-destructive">
                {errors.username.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Nhập mật khẩu"
                autoComplete="current-password"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-1 top-1 inline-flex h-10 w-10 items-center justify-center text-muted-foreground sm:right-2 sm:top-0.5 sm:h-8 sm:w-8"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password ? (
              <p role="alert" aria-live="polite" className="text-sm text-destructive">
                {errors.password.message}
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                id="rememberMe"
                onCheckedChange={(checked) => setValue('rememberMe', Boolean(checked))}
              />
              <Label htmlFor="rememberMe" className="text-sm">
                Ghi nhớ đăng nhập
              </Label>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Đăng nhập
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
