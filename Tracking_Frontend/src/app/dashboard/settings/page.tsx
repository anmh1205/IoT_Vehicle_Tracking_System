'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/PageContainer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authServices } from '@/lib/api/auth';
import { ProfileForm } from '@/features/settings/components/profile-form';
import { PasswordForm } from '@/features/settings/components/password-form';
import { NotificationPrefs } from '@/features/settings/components/notification-prefs';
import { ThemeSelector } from '@/features/settings/components/theme-selector';

export default function SettingsPage() {
  const [profile, setProfile] = useState({ fullName: '', email: '' });
  const [notifications, setNotifications] = useState({ emailAlerts: true, pushAlerts: true });

  const profileMutation = useMutation({ mutationFn: (payload: { fullName?: string; email?: string }) => authServices.updateProfile(payload), onSuccess: (_data, vars) => setProfile({ fullName: vars.fullName ?? '', email: vars.email ?? '' }) });
  const passwordMutation = useMutation({ mutationFn: (payload: { currentPassword: string; newPassword: string }) => authServices.updatePassword(payload) });
  const notifMutation = useMutation({ mutationFn: (payload: { emailAlerts: boolean; pushAlerts: boolean }) => authServices.updateNotifications(payload), onSuccess: () => {} });

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
            <CardHeader><CardTitle>Thông tin cá nhân</CardTitle></CardHeader>
            <CardContent>
              <ProfileForm defaultValues={profile} onSubmit={(payload) => profileMutation.mutate(payload)} isPending={profileMutation.isPending} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password">
          <Card>
            <CardHeader><CardTitle>Đổi mật khẩu</CardTitle></CardHeader>
            <CardContent>
              <PasswordForm onSubmit={(payload) => passwordMutation.mutate(payload)} isPending={passwordMutation.isPending} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader><CardTitle>Tùy chọn thông báo</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <NotificationPrefs value={notifications} onChange={setNotifications} />
              <Button onClick={() => notifMutation.mutate(notifications)}>Lưu thông báo</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader><CardTitle>Giao diện</CardTitle></CardHeader>
            <CardContent><ThemeSelector /></CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}



