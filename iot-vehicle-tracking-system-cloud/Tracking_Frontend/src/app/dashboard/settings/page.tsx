'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageContainer } from '@/components/layout/PageContainer';
import {
  authServices,
  type NotificationSettings,
  type UpdateNotificationSettingsInput,
} from '@/lib/api/auth';
import { useAuthStore } from '@/lib/stores/auth-store';
import { NotificationPrefs } from '@/features/settings/components/notification-prefs';
import { PasswordForm } from '@/features/settings/components/password-form';
import { ProfileForm } from '@/features/settings/components/profile-form';
import { ThemeSelector } from '@/features/settings/components/theme-selector';

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

const toEditableNotificationSettings = (settings?: NotificationSettings): NotificationSettings => ({
  emailAlerts: settings?.emailAlerts ?? DEFAULT_NOTIFICATION_SETTINGS.emailAlerts,
  pushAlerts: settings?.pushAlerts ?? DEFAULT_NOTIFICATION_SETTINGS.pushAlerts,
  alertTypes: settings?.alertTypes?.length ? settings.alertTypes : [...DEFAULT_NOTIFICATION_SETTINGS.alertTypes],
  channels: {
    discord: {
      enabled: settings?.channels.discord.enabled ?? DEFAULT_NOTIFICATION_SETTINGS.channels.discord.enabled,
      webhookUrl: settings?.channels.discord.webhookUrl ?? null,
    },
    telegram: {
      enabled: settings?.channels.telegram.enabled ?? DEFAULT_NOTIFICATION_SETTINGS.channels.telegram.enabled,
      botToken: settings?.channels.telegram.botToken ?? null,
      chatId: settings?.channels.telegram.chatId ?? null,
    },
  },
});

const toNotificationPayload = (settings: NotificationSettings): UpdateNotificationSettingsInput => ({
  emailAlerts: settings.emailAlerts,
  pushAlerts: settings.pushAlerts,
  alertTypes: settings.alertTypes,
  channels: {
    discord: {
      enabled: settings.channels.discord.enabled,
      webhookUrl: settings.channels.discord.webhookUrl?.trim() ? settings.channels.discord.webhookUrl.trim() : null,
    },
    telegram: {
      enabled: settings.channels.telegram.enabled,
      botToken: settings.channels.telegram.botToken?.trim() ? settings.channels.telegram.botToken.trim() : null,
      chatId: settings.channels.telegram.chatId?.trim() ? settings.channels.telegram.chatId.trim() : null,
    },
  },
});

const SettingsPage = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const setAuth = useAuthStore((state) => state.setAuth);
  const [notifications, setNotifications] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);

  const notificationSettings = useQuery({
    queryKey: ['auth', 'notification-settings'],
    queryFn: () => authServices.getNotificationSettings(),
  });

  useEffect(() => {
    setNotifications(toEditableNotificationSettings(notificationSettings.data?.preferences));
  }, [notificationSettings.data]);

  const profileDefaults = useMemo(
    () => ({
      fullName: user?.fullName ?? '',
      email: user?.email ?? '',
      avatarUrl: user?.avatarUrl ?? null,
    }),
    [user?.avatarUrl, user?.email, user?.fullName],
  );

  const profileMutation = useMutation({
    mutationFn: (payload: { fullName?: string; email?: string | null }) =>
      authServices.updateProfile(payload),
    onMutate: () => setProfileStatus(null),
    onSuccess: (updatedUser) => {
      setAuth(
        {
          ...updatedUser,
          isActive: updatedUser.status ? updatedUser.status === 'active' : true,
        },
        token,
      );
      setProfileStatus('Thông tin tài khoản đã được cập nhật.');
    },
    onError: () => {
      setProfileStatus('Không thể cập nhật hồ sơ. Vui lòng thử lại.');
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) =>
      authServices.updatePassword(payload),
    onMutate: () => setPasswordStatus(null),
    onSuccess: () => {
      setPasswordStatus('Mật khẩu đã được thay đổi.');
    },
    onError: () => {
      setPasswordStatus('Không thể đổi mật khẩu. Vui lòng kiểm tra lại thông tin.');
    },
  });

  const notificationMutation = useMutation({
    mutationFn: (payload: NotificationSettings) => authServices.updateNotificationSettings(toNotificationPayload(payload)),
    onMutate: () => setNotificationStatus(null),
    onSuccess: (result) => {
      queryClient.setQueryData(['auth', 'notification-settings'], result);
      setNotifications(toEditableNotificationSettings(result.preferences));
      setNotificationStatus('Tùy chọn thông báo đã được lưu.');
    },
    onError: () => {
      setNotificationStatus('Không thể lưu tùy chọn thông báo. Vui lòng thử lại.');
    },
  });

  return (
    <PageContainer pageTitle="Cài đặt" pageDescription="Tùy chỉnh tài khoản và hệ thống">
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Hồ sơ</TabsTrigger>
          <TabsTrigger value="password">Mật khẩu</TabsTrigger>
          <TabsTrigger value="notifications">Thông báo</TabsTrigger>
          <TabsTrigger value="appearance">Giao diện</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin cá nhân</CardTitle>
              <CardDescription>Thông tin này được dùng trong hồ sơ và khu vực quản trị.</CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm
                defaultValues={profileDefaults}
                onSubmit={(payload) => profileMutation.mutate(payload)}
                isPending={profileMutation.isPending}
                statusMessage={profileStatus}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>Đổi mật khẩu</CardTitle>
              <CardDescription>
                Dùng mật khẩu đủ mạnh để bảo vệ phiên làm việc và quyền quản trị.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PasswordForm
                onSubmit={(payload) => passwordMutation.mutate(payload)}
                isPending={passwordMutation.isPending}
                statusMessage={passwordStatus}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Tùy chọn thông báo</CardTitle>
              <CardDescription>
                Bật/tắt từng kênh cảnh báo theo quy trình vận hành của bạn.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <NotificationPrefs
                value={notifications}
                onChange={setNotifications}
                isLoading={notificationSettings.isLoading}
                statusMessage={notificationStatus}
                isPending={notificationMutation.isPending}
                onSubmit={() => notificationMutation.mutate(notifications)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Giao diện</CardTitle>
              <CardDescription>
                Điều chỉnh giao diện hiển thị để phù hợp môi trường vận hành của bạn.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ThemeSelector />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
};

export default SettingsPage;
