'use client';

import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Eye, EyeOff, Info, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authServices } from '@/lib/api/auth';
import { saveNativeAuthToken } from '@/lib/native-auth';
import { useAuthStore } from '@/lib/stores/auth-store';
import { getApiErrorMessage } from '@/lib/utils/api-error';
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
    if (reason === 'server-revocation-unconfirmed') {
      return 'Đã xóa phiên trên ứng dụng, nhưng chưa xác nhận được thu hồi phiên trên máy chủ. Hãy kiểm tra kết nối và đổi mật khẩu nếu cần.';
    }
    if (reason === 'native-credential-clear-unconfirmed') {
      return 'Đã yêu cầu đăng xuất máy chủ, nhưng không thể xác nhận xóa thông tin đăng nhập an toàn trên thiết bị. Không sử dụng chung thiết bị này cho đến khi xử lý.';
    }
    if (reason === 'logout-incomplete') {
      return 'Chưa xác nhận được đăng xuất máy chủ hoặc xóa phiên trên thiết bị. Hãy thử lại khi có kết nối và kiểm tra bảo mật tài khoản.';
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
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setErrorMessage(null);
    try {
      const data = await authServices.login({
        username: values.username,
        password: values.password,
      });
      try {
        await saveNativeAuthToken(data.token);
      } catch {
        // A native app cannot report a persistent login if secure storage failed.
        // Revoke the just-issued server session before exposing authenticated UI.
        let serverRevoked = false;
        try {
          await authServices.logout();
          serverRevoked = true;
        } catch {
          // An unavailable server must not be described as a completed logout.
        }
        setErrorMessage(
          serverRevoked
            ? 'Không thể lưu phiên đăng nhập an toàn trên thiết bị. Vui lòng thử lại.'
            : 'Không thể lưu phiên trên thiết bị và chưa xác nhận được thu hồi phiên máy chủ. Vui lòng kiểm tra kết nối và đăng nhập lại.',
        );
        return;
      }
      setAuth(
        {
          ...data.user,
          isActive: data.user.status ? data.user.status === 'active' : true,
        },
        data.token,
      );
      router.replace(redirectTo);
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;

      if (status === 401) {
        setErrorMessage(
          getApiErrorMessage(error, 'Thông tin đăng nhập không chính xác hoặc tài khoản không khả dụng.'),
        );
        return;
      }

      if ((error as { response?: unknown })?.response == null) {
        setErrorMessage('Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.');
        return;
      }

      if (typeof status === 'number' && status >= 500) {
        setErrorMessage('Hệ thống đang gặp sự cố. Vui lòng thử lại sau ít phút.');
        return;
      }

      setErrorMessage(
        getApiErrorMessage(error, 'Đăng nhập thất bại. Vui lòng thử lại.'),
      );
    }
  };

  return (
    <Card className="w-full max-w-md border-border/70 shadow-sm">
      <CardHeader>
        <h1 id="login-panel-heading" className="text-lg font-semibold leading-tight">Đăng nhập hệ thống</h1>
        <CardDescription>Nhập tài khoản để tiếp tục điều phối và giám sát đội xe.</CardDescription>
      </CardHeader>
      <CardContent>
        {infoMessage ? (
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertTitle>{reason === 'signed-out' ? 'Đã đăng xuất' : 'Thông báo phiên làm việc'}</AlertTitle>
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
              aria-invalid={Boolean(errors.username)}
              aria-describedby={errors.username ? 'username-error' : undefined}
              {...register('username')}
            />
            {errors.username ? (
              <p id="username-error" role="alert" className="text-sm text-destructive">
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
                className="pr-12"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'password-error' : undefined}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-md text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password ? (
              <p id="password-error" role="alert" className="text-sm text-destructive">
                {errors.password.message}
              </p>
            ) : null}
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
